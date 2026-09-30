import {
  calcDebtInterest,
  calcDebtProgress,
  calcDebtToIncomeRatio,
  calcMonthlyDebtCommitment,
  calcRemainingBalance,
  calcRemainingInstallments,
  estimateEndDate,
  getDebtRiskLevel,
  getDebtStatus,
  getInstallmentAmount,
  getNextDueDate,
  sumAmounts,
  type DebtInterestSummary,
  type DebtRiskLevel,
  type DebtStatus,
  type FinanceDebt,
  type IsoDate,
} from '@/lib/finance';
import type { Debt, DebtPayment } from '@/types/models';

/** Deuda de la base + sus abonos → formato de `lib/finance`. */
export function toFinanceDebt(debt: Debt, payments: readonly DebtPayment[]): FinanceDebt {
  const own = payments.filter((payment) => payment.debtId === debt.id);
  return {
    kind: debt.kind,
    principal: debt.principal,
    paidAmount: sumAmounts(own.map((payment) => payment.amount)),
    installmentsTotal: debt.installmentsTotal ?? undefined,
    installmentsPaid: debt.installmentsPaidInitial + own.filter((payment) => payment.isInstallment).length,
    extraPaidAmount: sumAmounts(own.filter((payment) => !payment.isInstallment).map((payment) => payment.amount)),
    installmentAmount: debt.installmentAmount ?? undefined,
    monthlyRate: debt.monthlyRate ?? undefined,
    firstPaymentDate: debt.firstPaymentDate ?? undefined,
    dueDate: debt.dueDate,
  };
}

export type DebtView = {
  debt: Debt;
  payments: DebtPayment[];
  finance: FinanceDebt;
  installmentAmount: number;
  remainingBalance: number;
  remainingInstallments: number | null;
  installmentsPaid: number;
  paidAmount: number;
  /** % pagado (0–100). */
  progress: number;
  status: DebtStatus;
  nextDueDate: IsoDate | null;
  endDate: IsoDate | null;
  interest: DebtInterestSummary;
};

export function buildDebtView(debt: Debt, payments: readonly DebtPayment[], today: IsoDate): DebtView {
  const finance = toFinanceDebt(debt, payments);
  return {
    debt,
    payments: payments.filter((payment) => payment.debtId === debt.id),
    finance,
    installmentAmount: getInstallmentAmount(finance),
    remainingBalance: calcRemainingBalance(finance),
    remainingInstallments: calcRemainingInstallments(finance),
    installmentsPaid: finance.installmentsPaid ?? 0,
    paidAmount: finance.paidAmount,
    progress: calcDebtProgress(finance),
    status: getDebtStatus(finance, today),
    nextDueDate: getNextDueDate(finance),
    endDate: estimateEndDate(finance),
    interest: calcDebtInterest(finance),
  };
}

export type DebtsSummary = {
  /** Deudas con saldo, primero las vencidas y por vencer. */
  active: DebtView[];
  paid: DebtView[];
  totalDebt: number;
  /** Suma de cuotas mensuales de las deudas en cuotas vigentes. */
  monthlyCommitment: number;
  /** Ratio deuda/ingreso (%) o `null` sin ingreso. */
  ratio: number | null;
  risk: DebtRiskLevel;
};

const STATUS_ORDER: Record<DebtStatus, number> = { overdue: 0, due_soon: 1, on_time: 2, paid: 3 };

/**
 * Resumen del módulo Deudas.
 * @param netIncome Ingreso líquido mensual (sueldo líquido + otros ingresos).
 */
export function buildDebtsSummary(debts: readonly Debt[], payments: readonly DebtPayment[], netIncome: number, today: IsoDate): DebtsSummary {
  const views = debts.map((debt) => buildDebtView(debt, payments, today));
  const active = views
    .filter((view) => view.status !== 'paid')
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (a.nextDueDate ?? '9999').localeCompare(b.nextDueDate ?? '9999'));
  const monthlyCommitment = calcMonthlyDebtCommitment(active.map((view) => view.finance));
  const ratio = calcDebtToIncomeRatio(monthlyCommitment, netIncome);
  return {
    active,
    paid: views.filter((view) => view.status === 'paid'),
    totalDebt: sumAmounts(active.map((view) => view.remainingBalance)),
    monthlyCommitment,
    ratio,
    risk: getDebtRiskLevel(ratio),
  };
}
