import { floorMoney, percentageOf, roundMoney } from './money';
import { isDateInPeriod, type FinancialPeriod } from './period';
import { EXPENSE_TYPES, type FinanceTransaction, type TransactionType } from './types';

/** Clave usada en `sumByCategory` para movimientos sin categoría. */
export const UNCATEGORIZED = 'uncategorized';

/** Suma los montos de un tipo de movimiento. */
export function sumByType(transactions: readonly FinanceTransaction[], type: TransactionType): number {
  return transactions.reduce((total, tx) => (tx.type === type ? total + tx.amount : total), 0);
}

/**
 * Suma los montos por categoría (`categoryId` → total).
 * Los movimientos sin categoría se agrupan en `UNCATEGORIZED`.
 * No filtra por tipo: pasar solo los movimientos que correspondan.
 */
export function sumByCategory(transactions: readonly FinanceTransaction[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const tx of transactions) {
    const key = tx.categoryId ?? UNCATEGORIZED;
    totals[key] = (totals[key] ?? 0) + tx.amount;
  }
  return totals;
}

/** Movimientos cuya fecha cae dentro del período. */
export function filterByPeriod<T extends Pick<FinanceTransaction, 'date'>>(
  transactions: readonly T[],
  period: FinancialPeriod,
): T[] {
  return transactions.filter((tx) => isDateInPeriod(tx.date, period));
}

/** Total gastado en el período (gastos fijos + hormiga; no incluye pagos de deuda). */
export function calcMonthlySpent(transactions: readonly FinanceTransaction[], period: FinancialPeriod): number {
  return filterByPeriod(transactions, period).reduce(
    (total, tx) => (EXPENSE_TYPES.includes(tx.type) ? total + tx.amount : total),
    0,
  );
}

/**
 * Saldo disponible = ingresos − gastos − pagos de deuda + ajustes.
 * Los ajustes vienen con signo. El resultado puede ser negativo.
 */
export function calcAvailableBalance(
  income: number,
  expenses: number,
  debtPayments: number,
  adjustments: number,
): number {
  return roundMoney(income - expenses - debtPayments + adjustments);
}

/** % del ingreso que representa lo gastado, o `null` si no hay ingreso. */
export function calcSpendingPercentage(spent: number, income: number): number | null {
  return percentageOf(spent, income);
}

/** Gasto diario promedio (0 si aún no transcurren días). */
export function calcDailyAverage(spent: number, daysElapsed: number): number {
  if (daysElapsed <= 0) return 0;
  return roundMoney(spent / daysElapsed);
}

/**
 * Cuánto se puede gastar por día lo que queda del período sin quedar en negativo.
 * Redondea hacia abajo (es un límite). 0 si no hay saldo o no quedan días.
 */
export function calcSafeDailySpend(available: number, daysRemaining: number): number {
  if (available <= 0 || daysRemaining <= 0) return 0;
  return floorMoney(available / daysRemaining);
}

export type EndOfMonthProjection = {
  /** Gasto total proyectado al cierre si se mantiene el ritmo actual. */
  projectedSpent: number;
  /** Ingreso − gasto proyectado. Negativo = déficit. */
  projectedBalance: number;
};

/**
 * Proyección al cierre del período según el ritmo de gasto actual.
 * Si aún no transcurren días, proyecta lo ya gastado.
 */
export function projectEndOfMonth(
  spent: number,
  daysElapsed: number,
  daysInPeriod: number,
  income: number,
): EndOfMonthProjection {
  const elapsed = Math.min(daysElapsed, daysInPeriod);
  const projectedSpent = elapsed <= 0 ? roundMoney(spent) : roundMoney((spent / elapsed) * daysInPeriod);
  return { projectedSpent, projectedBalance: roundMoney(income - projectedSpent) };
}

/** Tasa de ahorro (%) = (ingresos − gastos) / ingresos. `null` si no hay ingreso. Puede ser negativa. */
export function calcSavingsRate(income: number, expenses: number): number | null {
  return percentageOf(income - expenses, income);
}

export type PeriodComparison = {
  /** actual − anterior. */
  difference: number;
  /** Variación % respecto al anterior; `null` si el anterior es 0. */
  percentage: number | null;
  trend: 'up' | 'down' | 'equal';
};

/** Compara un valor con el del período anterior. */
export function compareWithPreviousPeriod(current: number, previous: number): PeriodComparison {
  const difference = roundMoney(current - previous);
  return {
    difference,
    percentage: previous === 0 ? null : (difference / Math.abs(previous)) * 100,
    trend: difference > 0 ? 'up' : difference < 0 ? 'down' : 'equal',
  };
}
