import type { IsoDate } from './period';

/**
 * Tipos de movimiento.
 * - `income`: ingreso (sueldo, ingreso extra).
 * - `fixed_expense` / `ant_expense`: gasto fijo / gasto hormiga.
 * - `debt_payment`: abono o pago de deuda.
 * - `adjustment`: corrección de saldo (el único con monto con signo).
 */
export type TransactionType = 'income' | 'fixed_expense' | 'ant_expense' | 'debt_payment' | 'adjustment';

/** Datos mínimos de un movimiento que necesitan los cálculos. */
export type FinanceTransaction = {
  type: TransactionType;
  /** Pesos enteros. Positivo salvo en `adjustment`, que puede ser negativo. */
  amount: number;
  /** Fecha del movimiento (`yyyy-MM-dd`; si trae hora se ignora). */
  date: IsoDate;
  categoryId: string | null;
};

/** Tipos que cuentan como gasto. */
export const EXPENSE_TYPES: readonly TransactionType[] = ['fixed_expense', 'ant_expense'];
