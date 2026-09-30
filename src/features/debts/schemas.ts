import { z } from 'zod';

import { amountText, isoDateField, noteField } from '@/features/forms/fields';
import { formatAmountInput, formatCLP, formatDecimalInput, parseCLPInput, parseDecimalInput } from '@/lib/finance';
import { DEBT_KINDS } from '@/types/enums';
import type { Debt, DebtInput } from '@/types/models';

const MAX_INSTALLMENTS = 600;
const MAX_MONTHLY_RATE_PERCENT = 20;

/** Texto entero opcional: vacío → `null`, inválido → `NaN`. */
const toInt = (text: string) => (text.trim() === '' ? null : /^\d+$/.test(text.trim()) ? Number(text.trim()) : NaN);

/**
 * Formulario de deuda. Los campos de cuotas solo aplican a `installment`;
 * los campos numéricos llegan como texto desde los inputs.
 */
export const debtSchema = z
  .object({
    kind: z.enum(DEBT_KINDS),
    name: z.string().trim().min(1, 'Ponle un nombre, ej.: Crédito de consumo').max(40, 'Usa máximo 40 caracteres'),
    creditor: z.string().trim().max(40, 'Usa máximo 40 caracteres'),
    principal: amountText('Ingresa el monto de la deuda', { positive: true }),
    startDate: isoDateField,
    installmentsTotal: z.string(),
    installmentsPaidInitial: z.string(),
    installmentAmount: z.string(),
    monthlyRatePercent: z.string(),
    firstPaymentDate: z.string(),
    dueDate: z.string(),
    accountId: z.string().nullable(),
    note: noteField,
  })
  .superRefine((values, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    if (values.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(values.dueDate)) issue('dueDate', 'Elige una fecha válida');
    if (values.kind !== 'installment') return;

    const total = toInt(values.installmentsTotal);
    if (total === null || Number.isNaN(total)) issue('installmentsTotal', 'Ingresa el número de cuotas');
    else if (total < 1) issue('installmentsTotal', 'Las cuotas deben ser al menos 1');
    else if (total > MAX_INSTALLMENTS) issue('installmentsTotal', `Máximo ${MAX_INSTALLMENTS} cuotas`);

    const paid = toInt(values.installmentsPaidInitial) ?? 0;
    if (Number.isNaN(paid)) issue('installmentsPaidInitial', 'Ingresa un número entero');
    else if (total !== null && !Number.isNaN(total) && paid > total) issue('installmentsPaidInitial', 'No puede ser mayor que el total de cuotas');

    if (values.installmentAmount.trim() !== '') {
      const amount = parseCLPInput(values.installmentAmount);
      if (amount === null || amount <= 0) issue('installmentAmount', 'La cuota debe ser mayor a $0');
    }
    if (values.monthlyRatePercent.trim() !== '') {
      const rate = parseDecimalInput(values.monthlyRatePercent);
      if (rate === null || rate < 0) issue('monthlyRatePercent', 'Ingresa la tasa como número, ej.: 1,5');
      else if (rate > MAX_MONTHLY_RATE_PERCENT) issue('monthlyRatePercent', `Revisa la tasa: máximo ${MAX_MONTHLY_RATE_PERCENT}% mensual`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.firstPaymentDate)) issue('firstPaymentDate', 'Elige la fecha de la primera cuota');
  });

export type DebtFormValues = z.input<typeof debtSchema>;
export type DebtFormOutput = z.output<typeof debtSchema>;

/** Valores iniciales del formulario (deuda nueva o existente). */
export function toDebtFormValues(debt: Debt | null, today: string, defaultKind: DebtFormValues['kind'] = 'installment'): DebtFormValues {
  return {
    kind: debt?.kind ?? defaultKind,
    name: debt?.name ?? '',
    creditor: debt?.creditor ?? '',
    principal: debt ? formatAmountInput(debt.principal) : '',
    startDate: debt?.startDate ?? today,
    installmentsTotal: debt?.installmentsTotal ? String(debt.installmentsTotal) : '',
    installmentsPaidInitial: debt ? String(debt.installmentsPaidInitial) : '0',
    installmentAmount: debt?.installmentAmount ? formatAmountInput(debt.installmentAmount) : '',
    monthlyRatePercent: debt?.monthlyRate ? formatDecimalInput(debt.monthlyRate * 100) : '',
    firstPaymentDate: debt?.firstPaymentDate ?? today,
    dueDate: debt?.dueDate ?? '',
    accountId: debt?.accountId ?? null,
    note: debt?.note ?? '',
  };
}

/** Salida validada → datos del repositorio. Limpia los campos que no aplican al tipo. */
export function toDebtInput(values: DebtFormOutput): DebtInput {
  const isInstallment = values.kind === 'installment';
  const rate = parseDecimalInput(values.monthlyRatePercent);
  return {
    kind: values.kind,
    name: values.name,
    creditor: values.creditor || null,
    principal: values.principal,
    startDate: values.startDate,
    installmentsTotal: isInstallment ? toInt(values.installmentsTotal) : null,
    installmentsPaidInitial: isInstallment ? (toInt(values.installmentsPaidInitial) ?? 0) : 0,
    installmentAmount: isInstallment && values.installmentAmount.trim() !== '' ? parseCLPInput(values.installmentAmount) : null,
    monthlyRate: isInstallment && rate !== null && rate > 0 ? rate / 100 : null,
    firstPaymentDate: isInstallment ? values.firstPaymentDate : null,
    dueDate: !isInstallment && values.dueDate ? values.dueDate : null,
    accountId: values.accountId,
    note: values.note,
  };
}

/** Abono a una deuda. `maxAmount` = saldo por pagar (no se puede abonar más). */
export function createPaymentSchema(maxAmount: number) {
  return z.object({
    amount: amountText('Ingresa el monto del abono', { positive: true }).refine((amount) => amount <= maxAmount, {
      message: `El abono supera lo que queda por pagar (${formatCLP(maxAmount)})`,
    }),
    date: isoDateField,
    accountId: z.string({ error: 'Elige desde qué cuenta pagas' }).min(1, 'Elige desde qué cuenta pagas'),
    isInstallment: z.boolean(),
  });
}
export type PaymentFormValues = z.input<ReturnType<typeof createPaymentSchema>>;
export type PaymentFormOutput = z.output<ReturnType<typeof createPaymentSchema>>;
