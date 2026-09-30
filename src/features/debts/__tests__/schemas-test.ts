import { createPaymentSchema, debtSchema, toDebtFormValues, toDebtInput, type DebtFormValues } from '../schemas';

const firstErrors = (values: DebtFormValues) => {
  const errors: Record<string, string> = {};
  for (const issue of debtSchema.safeParse(values).error?.issues ?? []) errors[issue.path.join('.')] ??= issue.message;
  return errors;
};

const installment: DebtFormValues = {
  ...toDebtFormValues(null, '2026-09-30'),
  name: 'Crédito',
  principal: '1.000.000',
  installmentsTotal: '12',
  installmentsPaidInitial: '2',
  monthlyRatePercent: '2',
  firstPaymentDate: '2026-06-05',
};

describe('debtSchema', () => {
  it('deuda en cuotas válida → datos del repositorio', () => {
    expect(toDebtInput(debtSchema.parse(installment))).toEqual({
      kind: 'installment',
      name: 'Crédito',
      creditor: null,
      principal: 1_000_000,
      startDate: '2026-09-30',
      installmentsTotal: 12,
      installmentsPaidInitial: 2,
      installmentAmount: null,
      monthlyRate: 0.02,
      firstPaymentDate: '2026-06-05',
      dueDate: null,
      accountId: null,
      note: null,
    });
  });

  it('valida cuotas, tasa y cuota', () => {
    expect(firstErrors({ ...installment, installmentsTotal: '0' }).installmentsTotal).toBe('Las cuotas deben ser al menos 1');
    expect(firstErrors({ ...installment, installmentsTotal: '' }).installmentsTotal).toBe('Ingresa el número de cuotas');
    expect(firstErrors({ ...installment, installmentsTotal: '700' }).installmentsTotal).toBe('Máximo 600 cuotas');
    expect(firstErrors({ ...installment, installmentsPaidInitial: '13' }).installmentsPaidInitial).toBe('No puede ser mayor que el total de cuotas');
    expect(firstErrors({ ...installment, installmentsPaidInitial: '1,5' }).installmentsPaidInitial).toBe('Ingresa un número entero');
    expect(firstErrors({ ...installment, monthlyRatePercent: '25' }).monthlyRatePercent).toBe('Revisa la tasa: máximo 20% mensual');
    expect(firstErrors({ ...installment, monthlyRatePercent: 'x' }).monthlyRatePercent).toBe('Ingresa la tasa como número, ej.: 1,5');
    expect(firstErrors({ ...installment, installmentAmount: '0' }).installmentAmount).toBe('La cuota debe ser mayor a $0');
    expect(firstErrors({ ...installment, firstPaymentDate: '' }).firstPaymentDate).toBe('Elige la fecha de la primera cuota');
    expect(firstErrors({ ...installment, principal: '' }).principal).toBe('Ingresa el monto de la deuda');
  });

  it('pendiente: ignora los campos de cuotas y guarda la fecha límite', () => {
    const pending: DebtFormValues = { ...installment, kind: 'pending', installmentsTotal: '', dueDate: '2026-10-15', creditor: 'Juan' };
    expect(firstErrors(pending)).toEqual({});
    expect(toDebtInput(debtSchema.parse(pending))).toMatchObject({
      kind: 'pending',
      creditor: 'Juan',
      installmentsTotal: null,
      installmentsPaidInitial: 0,
      monthlyRate: null,
      firstPaymentDate: null,
      dueDate: '2026-10-15',
    });
    expect(firstErrors({ ...pending, dueDate: '15/10/2026' }).dueDate).toBe('Elige una fecha válida');
  });

  it('valores del formulario desde una deuda existente', () => {
    const input = toDebtInput(debtSchema.parse({ ...installment, installmentAmount: '94.560', monthlyRatePercent: '1,5' }));
    const values = toDebtFormValues({ ...input, id: 'x', createdAt: '', updatedAt: '', deletedAt: null }, '2026-09-30');
    expect(values).toMatchObject({ installmentAmount: '94.560', monthlyRatePercent: '1,5', installmentsTotal: '12', installmentsPaidInitial: '2' });
  });
});

describe('createPaymentSchema', () => {
  const schema = createPaymentSchema(70_000);

  it('acepta abonos hasta el saldo por pagar', () => {
    expect(schema.parse({ amount: '70.000', date: '2026-09-30', accountId: 'main', isInstallment: false }).amount).toBe(70_000);
  });

  it('rechaza abonos mayores al saldo o sin cuenta', () => {
    const result = schema.safeParse({ amount: '80.000', date: '2026-09-30', accountId: '', isInstallment: false });
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(['El abono supera lo que queda por pagar ($70.000)', 'Elige desde qué cuenta pagas']);
  });
});
