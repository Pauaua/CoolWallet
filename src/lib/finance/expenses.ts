import { addMonths, differenceInCalendarDays, differenceInCalendarMonths, subDays } from 'date-fns';

import { compareWithPreviousPeriod, sumByCategory, type PeriodComparison } from './cashflow';
import { percentageOf, roundMoney, sumAmounts } from './money';
import { dateWithDay, parseIsoDate, toIsoDate, type FinancialPeriod, type IsoDate } from './period';
import type { FinanceTransaction } from './types';

export type ExpenseFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual';

/** Veces por año de cada frecuencia. */
export const OCCURRENCES_PER_YEAR: Record<ExpenseFrequency, number> = {
  daily: 365,
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  bimonthly: 6,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
};

/** Costo anual de un gasto que se repite (ej.: café diario de $2.500 → $912.500). */
export function annualizeExpense(amount: number, frequency: ExpenseFrequency): number {
  return roundMoney(amount * OCCURRENCES_PER_YEAR[frequency]);
}

/** Equivalente mensual de un gasto que se repite (ej.: $120.000 anual → $10.000). */
export function toMonthlyAmount(amount: number, frequency: ExpenseFrequency): number {
  return roundMoney((amount * OCCURRENCES_PER_YEAR[frequency]) / 12);
}

export type VariableExpensesImpact = {
  /** Total de gastos variables registrados. */
  total: number;
  /** % del ingreso mensual; `null` si no hay ingreso. */
  percentageOfIncome: number | null;
  /** Total proyectado del mes al ritmo actual. */
  projectedMonthly: number;
  /** Proyección anual (mensual × 12). */
  projectedAnnual: number;
};

/**
 * Impacto de los gastos variables del período.
 * Si se indica el avance del período, proyecta el mes completo al ritmo actual;
 * si no, toma el total como el gasto del mes.
 */
export function calcVariableExpensesImpact(
  variableExpenses: readonly { amount: number }[],
  income: number,
  progress?: { daysElapsed: number; daysInPeriod: number },
): VariableExpensesImpact {
  const total = sumAmounts(variableExpenses.map((expense) => expense.amount));
  const monthly =
    progress && progress.daysElapsed > 0 && progress.daysElapsed < progress.daysInPeriod
      ? (total / progress.daysElapsed) * progress.daysInPeriod
      : total;
  return {
    total,
    percentageOfIncome: percentageOf(total, income),
    projectedMonthly: roundMoney(monthly),
    projectedAnnual: roundMoney(monthly * 12),
  };
}

export type RecurringFrequency = 'monthly' | 'bimonthly' | 'annual';

const MONTHS_BETWEEN: Record<RecurringFrequency, number> = { monthly: 1, bimonthly: 2, annual: 12 };

/** Datos mínimos de un gasto fijo para generar sus vencimientos. */
export type RecurringExpenseDefinition = {
  id: string;
  amount: number;
  /** Día de vencimiento (1–31; se ajusta en meses cortos). */
  dueDay: number;
  frequency: RecurringFrequency;
  /** Desde cuándo rige: el primer vencimiento es el primero en o después de esta fecha. */
  startDate: IsoDate;
  /** Último día en que rige (opcional). */
  endDate?: IsoDate | null;
  active: boolean;
};

export type RecurringExpenseOccurrence = {
  fixedExpenseId: string;
  dueDate: IsoDate;
  amount: number;
};

/**
 * Vencimientos de los gastos fijos que caen dentro del período.
 * Los bimestrales y anuales se repiten cada 2 o 12 meses contados desde el
 * mes del primer vencimiento. Ordenados por fecha.
 */
export function generateRecurringExpenses(
  fixedExpenses: readonly RecurringExpenseDefinition[],
  period: FinancialPeriod,
): RecurringExpenseOccurrence[] {
  const periodStart = parseIsoDate(period.start);
  const periodEnd = parseIsoDate(period.end);
  const occurrences: RecurringExpenseOccurrence[] = [];

  for (const expense of fixedExpenses) {
    if (!expense.active) continue;
    const startDate = parseIsoDate(expense.startDate);
    const endDate = expense.endDate ? parseIsoDate(expense.endDate) : null;
    const firstDue = firstDueOnOrAfter(startDate, expense.dueDay);
    const step = MONTHS_BETWEEN[expense.frequency];

    // Un período dura como máximo ~1 mes, pero se recorren todos los meses que toca.
    const months = differenceInCalendarMonths(periodEnd, periodStart);
    for (let offset = 0; offset <= months; offset += 1) {
      const due = dateWithDay(addMonths(dateWithDay(periodStart, 1), offset), expense.dueDay);
      if (due < periodStart || due > periodEnd || due < firstDue) continue;
      if (endDate && due > endDate) continue;
      if (differenceInCalendarMonths(due, firstDue) % step !== 0) continue;
      occurrences.push({ fixedExpenseId: expense.id, dueDate: toIsoDate(due), amount: expense.amount });
    }
  }

  return occurrences.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function firstDueOnOrAfter(date: Date, dueDay: number): Date {
  const sameMonth = dateWithDay(date, dueDay);
  return sameMonth >= date ? sameMonth : dateWithDay(addMonths(dateWithDay(date, 1), 1), dueDay);
}

/**
 * Próximo vencimiento de un gasto fijo en o después de `from` (busca hasta 13 meses).
 * `null` si está inactivo o ya terminó.
 */
export function getNextRecurringDueDate(expense: RecurringExpenseDefinition, from: IsoDate | Date): IsoDate | null {
  const start = parseIsoDate(from);
  const window: FinancialPeriod = {
    start: toIsoDate(start),
    end: toIsoDate(subDays(addMonths(start, 13), 1)),
    daysInPeriod: differenceInCalendarDays(addMonths(start, 13), start),
  };
  return generateRecurringExpenses([expense], window)[0]?.dueDate ?? null;
}

export type OccurrenceStatus = 'paid' | 'overdue' | 'due_today' | 'due_soon' | 'upcoming';

/** Estado de un vencimiento: pagado, vencido, vence hoy, por vencer (dentro de `dueSoonDays`) o próximo. */
export function getOccurrenceStatus(dueDate: IsoDate, isPaid: boolean, today: IsoDate | Date, dueSoonDays = 3): OccurrenceStatus {
  if (isPaid) return 'paid';
  const days = differenceInCalendarDays(parseIsoDate(dueDate), parseIsoDate(today));
  if (days < 0) return 'overdue';
  if (days === 0) return 'due_today';
  if (days <= dueSoonDays) return 'due_soon';
  return 'upcoming';
}

export type FixedExpensesProgress = {
  total: number;
  paid: number;
  pending: number;
  paidCount: number;
  pendingCount: number;
  /** % del monto ya pagado (0 si no hay gastos fijos). */
  paidPercentage: number;
};

/** Avance de los gastos fijos del período. */
export function calcFixedExpensesProgress(occurrences: readonly { amount: number; isPaid: boolean }[]): FixedExpensesProgress {
  const paidItems = occurrences.filter((item) => item.isPaid);
  const pendingItems = occurrences.filter((item) => !item.isPaid);
  const paid = sumAmounts(paidItems.map((item) => item.amount));
  const pending = sumAmounts(pendingItems.map((item) => item.amount));
  const total = paid + pending;
  return {
    total,
    paid,
    pending,
    paidCount: paidItems.length,
    pendingCount: pendingItems.length,
    paidPercentage: percentageOf(paid, total) ?? 0,
  };
}

/**
 * Montos más usados (para los chips del registro rápido): primero los más
 * frecuentes; si faltan, se completan con `fallback`. Ignora montos ≤ 0.
 */
export function getFrequentAmounts(amounts: readonly number[], limit = 6, fallback: readonly number[] = [1_000, 2_000, 3_000, 5_000, 10_000, 20_000]): number[] {
  const counts = new Map<number, number>();
  for (const amount of amounts) if (amount > 0) counts.set(amount, (counts.get(amount) ?? 0) + 1);
  const frequent = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([amount]) => amount);
  const result = frequent.slice(0, limit);
  for (const amount of fallback) {
    if (result.length >= limit) break;
    if (!result.includes(amount)) result.push(amount);
  }
  return result.sort((a, b) => a - b);
}

export type CategoryShare = {
  /** `categoryId` o `UNCATEGORIZED`. */
  categoryId: string;
  total: number;
  /** % del total del conjunto. */
  percentage: number;
};

/** Gasto por categoría con su participación, de mayor a menor. */
export function calcCategoryBreakdown(transactions: readonly FinanceTransaction[]): CategoryShare[] {
  const totals = sumByCategory(transactions);
  const grandTotal = sumAmounts(Object.values(totals));
  return Object.entries(totals)
    .map(([categoryId, total]) => ({ categoryId, total, percentage: percentageOf(total, grandTotal) ?? 0 }))
    .sort((a, b) => b.total - a.total || a.categoryId.localeCompare(b.categoryId));
}

/**
 * Agrupa las categorías más chicas en una sola entrada (para gráficos con
 * pocas porciones). `otherId` identifica la porción agrupada.
 */
export function foldSmallCategories(shares: readonly CategoryShare[], maxSlices: number, otherId: string): CategoryShare[] {
  if (shares.length <= maxSlices) return [...shares];
  const kept = shares.slice(0, maxSlices - 1);
  const rest = shares.slice(maxSlices - 1);
  const total = sumAmounts(rest.map((share) => share.total));
  return [...kept, { categoryId: otherId, total, percentage: sumAmounts(rest.map((share) => share.percentage)) }];
}

export type CategoryComparison = PeriodComparison & { categoryId: string; current: number; previous: number };

/** Compara el gasto por categoría con el período anterior, ordenado por mayor alza. */
export function compareCategoriesWithPrevious(current: readonly CategoryShare[], previous: readonly CategoryShare[]): CategoryComparison[] {
  const previousById = new Map(previous.map((share) => [share.categoryId, share.total]));
  const ids = new Set([...current.map((share) => share.categoryId), ...previous.map((share) => share.categoryId)]);
  const currentById = new Map(current.map((share) => [share.categoryId, share.total]));
  return [...ids]
    .map((categoryId) => {
      const now = currentById.get(categoryId) ?? 0;
      const before = previousById.get(categoryId) ?? 0;
      return { categoryId, current: now, previous: before, ...compareWithPreviousPeriod(now, before) };
    })
    .sort((a, b) => b.difference - a.difference || a.categoryId.localeCompare(b.categoryId));
}
