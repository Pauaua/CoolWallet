import { calcDailyAverage, sumByType } from './cashflow';
import { roundMoney } from './money';
import { dateWithDay, parseIsoDate, toIsoDate, type FinancialPeriod, type IsoDate, type PeriodMode } from './period';
import type { FinanceTransaction } from './types';

/**
 * Efecto de un movimiento en el saldo: ingresos suman; gastos y pagos de
 * deuda restan; los ajustes ya traen su signo.
 */
export function signedAmount(transaction: Pick<FinanceTransaction, 'type' | 'amount'>): number {
  switch (transaction.type) {
    case 'income':
    case 'adjustment':
      return transaction.amount;
    default:
      return -transaction.amount;
  }
}

/** Saldo de una cuenta = saldo inicial + efecto de sus movimientos. */
export function calcAccountBalance(initialBalance: number, transactions: readonly Pick<FinanceTransaction, 'type' | 'amount'>[]): number {
  return roundMoney(transactions.reduce((balance, tx) => balance + signedAmount(tx), initialBalance));
}

/**
 * Saldo de cada cuenta. Los movimientos sin cuenta (o de una cuenta eliminada)
 * no se asignan a ninguna.
 */
export function calcAccountBalances<T extends Pick<FinanceTransaction, 'type' | 'amount'> & { accountId: string | null }>(
  accounts: readonly { id: string; initialBalance: number }[],
  transactions: readonly T[],
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const account of accounts) balances[account.id] = account.initialBalance;
  for (const tx of transactions) {
    if (tx.accountId !== null && balances[tx.accountId] !== undefined) {
      balances[tx.accountId] = (balances[tx.accountId] ?? 0) + signedAmount(tx);
    }
  }
  return balances;
}

/** Monto del ajuste para que el saldo registrado pase a ser el saldo real (con signo). */
export function calcAdjustmentAmount(currentBalance: number, realBalance: number): number {
  return roundMoney(realBalance - currentBalance);
}

export type PeriodFlow = {
  income: number;
  expenses: number;
  debtPayments: number;
  /** Suma con signo de los ajustes. */
  adjustments: number;
  /** Resultado del período: ingresos − gastos − pagos de deuda + ajustes. */
  net: number;
};

/** Resumen del flujo de un conjunto de movimientos (normalmente, los del período). */
export function summarizePeriodFlow(transactions: readonly FinanceTransaction[]): PeriodFlow {
  const income = sumByType(transactions, 'income');
  const expenses = sumByType(transactions, 'fixed_expense') + sumByType(transactions, 'ant_expense');
  const debtPayments = sumByType(transactions, 'debt_payment');
  const adjustments = sumByType(transactions, 'adjustment');
  return { income, expenses, debtPayments, adjustments, net: roundMoney(income - expenses - debtPayments + adjustments) };
}

/**
 * Fecha en que se espera el sueldo dentro del período.
 * - `payday`: el período parte el día de pago → es su primer día.
 * - `calendar`: el día de pago de ese mes (ajustado a meses cortos).
 */
export function getSalaryDate(period: FinancialPeriod, payDay: number, mode: PeriodMode): IsoDate {
  if (mode === 'payday') return period.start;
  return toIsoDate(dateWithDay(parseIsoDate(period.start), payDay));
}

/** Si corresponde preguntar "¿Recibiste tu sueldo?": ya llegó la fecha y aún no se registra. */
export function isSalaryPending(salaryDate: IsoDate, today: IsoDate | Date, salaryRegistered: boolean): boolean {
  if (salaryRegistered) return false;
  return toIsoDate(parseIsoDate(today)) >= salaryDate;
}

/**
 * Ingreso de referencia del período (para % gastado y proyecciones):
 * lo registrado más el sueldo esperado si todavía no se registra.
 */
export function calcPeriodIncomeBase(registeredIncome: number, expectedSalary: number, salaryRegistered: boolean): number {
  return roundMoney(registeredIncome + (salaryRegistered ? 0 : Math.max(0, expectedSalary)));
}

/**
 * Saldo proyectado al cierre del período si se mantiene el ritmo de gasto:
 * disponible + ingresos pendientes − (promedio diario × días que faltan después de hoy).
 */
export function projectClosingBalance(
  available: number,
  pendingIncome: number,
  spent: number,
  daysElapsed: number,
  daysInPeriod: number,
): number {
  const futureDays = Math.max(0, daysInPeriod - Math.max(0, daysElapsed));
  return roundMoney(available + pendingIncome - calcDailyAverage(spent, daysElapsed) * futureDays);
}
