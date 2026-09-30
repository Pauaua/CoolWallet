import {
  calcAccountBalances,
  calcDailyAverage,
  calcFreeToSpend,
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
  sumByType,
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
  /** Monto de los gastos fijos del período aún sin pagar. */
  pendingFixedExpenses: number;
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
  /** Gastos fijos + variables del período. */
  spent: number;
  /** Solo gastos variables (base del ritmo diario). */
  variableSpent: number;
  pendingFixedExpenses: number;
  /** Disponible + ingresos pendientes − gastos fijos por pagar. */
  freeToSpend: number;
  spentPercentage: number | null;
  daysElapsed: number;
  daysRemaining: number;
  /** Promedio diario de gasto variable. */
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
  const variableSpent = sumByType(periodTransactions, 'variable_expense');
  const pendingFixedExpenses = Math.max(0, input.pendingFixedExpenses);
  const freeToSpend = calcFreeToSpend(available, pendingIncome, pendingFixedExpenses);

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
    variableSpent,
    pendingFixedExpenses,
    freeToSpend,
    spentPercentage: calcSpendingPercentage(spent, incomeBase),
    daysElapsed,
    daysRemaining,
    dailyAverage: calcDailyAverage(variableSpent, daysElapsed),
    safeDailySpend: calcSafeDailySpend(freeToSpend, daysRemaining),
    projectedClosingBalance: projectClosingBalance(available, pendingIncome, pendingFixedExpenses, variableSpent, daysElapsed, period.daysInPeriod),
  };
}
