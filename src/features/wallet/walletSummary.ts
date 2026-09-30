import {
  calcAccountBalances,
  calcDailyAverage,
  calcPeriodIncomeBase,
  calcSafeDailySpend,
  calcSpendingPercentage,
  filterByPeriod,
  getDaysElapsed,
  getDaysRemaining,
  getFinancialPeriod,
  getSalaryDate,
  isSalaryPending,
  projectClosingBalance,
  summarizePeriodFlow,
  sumAmounts,
  type FinancialPeriod,
  type IsoDate,
  type PeriodFlow,
  type PeriodMode,
} from '@/lib/finance';
import type { Account, Transaction } from '@/types/models';

export type WalletSummaryInput = {
  accounts: readonly Account[];
  /** Todos los movimientos activos (para los saldos). */
  transactions: readonly Transaction[];
  payDay: number;
  periodMode: PeriodMode;
  /** Sueldo líquido calculado del perfil. */
  expectedSalary: number;
  today: IsoDate | Date;
};

export type AccountWithBalance = Account & { balance: number };

export type WalletSummary = {
  period: FinancialPeriod;
  accounts: AccountWithBalance[];
  /** Dinero disponible hoy: suma de los saldos de las cuentas. */
  available: number;
  flow: PeriodFlow;
  periodTransactions: Transaction[];
  salaryDate: IsoDate;
  salaryRegistered: boolean;
  /** Mostrar "¿Recibiste tu sueldo?". */
  salaryPending: boolean;
  /** Sueldo que aún no se registra en este período (0 si ya se registró). */
  pendingIncome: number;
  /** Ingreso de referencia del período (registrado + sueldo pendiente). */
  incomeBase: number;
  spent: number;
  spentPercentage: number | null;
  daysElapsed: number;
  daysRemaining: number;
  dailyAverage: number;
  safeDailySpend: number;
  projectedClosingBalance: number;
};

/**
 * Arma el resumen de la Billetera combinando las funciones de `lib/finance`.
 * No hace cálculos propios: solo decide qué datos pasar a cada función.
 */
export function buildWalletSummary(input: WalletSummaryInput): WalletSummary {
  const period = getFinancialPeriod(input.today, input.payDay, input.periodMode);
  const balances = calcAccountBalances(input.accounts, input.transactions);
  const accounts = input.accounts.map((account) => ({ ...account, balance: balances[account.id] ?? account.initialBalance }));
  const available = sumAmounts(accounts.map((account) => account.balance));

  const periodTransactions = filterByPeriod(input.transactions, period);
  const flow = summarizePeriodFlow(periodTransactions);
  const salaryRegistered = periodTransactions.some((tx) => tx.isSalary);
  const salaryDate = getSalaryDate(period, input.payDay, input.periodMode);
  const hasSalary = input.expectedSalary > 0;
  const pendingIncome = salaryRegistered || !hasSalary ? 0 : input.expectedSalary;
  const incomeBase = calcPeriodIncomeBase(flow.income, pendingIncome, salaryRegistered);

  const daysElapsed = getDaysElapsed(period, input.today);
  const daysRemaining = getDaysRemaining(period, input.today);
  const spent = flow.expenses;

  return {
    period,
    accounts,
    available,
    flow,
    periodTransactions,
    salaryDate,
    salaryRegistered,
    salaryPending: hasSalary && isSalaryPending(salaryDate, input.today, salaryRegistered),
    pendingIncome,
    incomeBase,
    spent,
    spentPercentage: calcSpendingPercentage(spent, incomeBase),
    daysElapsed,
    daysRemaining,
    dailyAverage: calcDailyAverage(spent, daysElapsed),
    safeDailySpend: calcSafeDailySpend(available + pendingIncome, daysRemaining),
    projectedClosingBalance: projectClosingBalance(available, pendingIncome, spent, daysElapsed, period.daysInPeriod),
  };
}
