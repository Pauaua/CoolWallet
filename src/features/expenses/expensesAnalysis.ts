import {
  calcCategoryBreakdown,
  calcVariableExpensesImpact,
  compareCategoriesWithPrevious,
  compareWithPreviousPeriod,
  getOccurrenceStatus,
  sumAmounts,
  UNCATEGORIZED,
  type CategoryComparison,
  type CategoryShare,
  type IsoDate,
  type OccurrenceStatus,
  type PeriodComparison,
  type VariableExpensesImpact,
} from '@/lib/finance';
import type { FixedExpense, FixedExpenseOccurrence, Transaction } from '@/types/models';

export type CategoryAnalysis = {
  total: number;
  breakdown: CategoryShare[];
  totalComparison: PeriodComparison;
  /** Categorías que más subieron primero. */
  categoryChanges: CategoryComparison[];
};

/** Distribución por categoría y comparación con el período anterior. */
export function buildCategoryAnalysis(current: readonly Transaction[], previous: readonly Transaction[]): CategoryAnalysis {
  const breakdown = calcCategoryBreakdown(current);
  const total = sumAmounts(current.map((tx) => tx.amount));
  return {
    total,
    breakdown,
    totalComparison: compareWithPreviousPeriod(total, sumAmounts(previous.map((tx) => tx.amount))),
    categoryChanges: compareCategoriesWithPrevious(breakdown, calcCategoryBreakdown(previous)),
  };
}

export type TopCategory = { categoryId: string; total: number; projectedAnnual: number };

export type VariableAnalysis = CategoryAnalysis & {
  impact: VariableExpensesImpact;
  /** Top 3 del mes con su costo anual proyectado al ritmo actual. */
  topCategories: TopCategory[];
};

export function buildVariableAnalysis(input: {
  current: readonly Transaction[];
  previous: readonly Transaction[];
  incomeBase: number;
  daysElapsed: number;
  daysInPeriod: number;
}): VariableAnalysis {
  const analysis = buildCategoryAnalysis(input.current, input.previous);
  const progress = { daysElapsed: input.daysElapsed, daysInPeriod: input.daysInPeriod };
  const topCategories = analysis.breakdown
    .filter((share) => share.categoryId !== UNCATEGORIZED)
    .slice(0, 3)
    .map((share) => ({
      categoryId: share.categoryId,
      total: share.total,
      projectedAnnual: calcVariableExpensesImpact(
        input.current.filter((tx) => tx.categoryId === share.categoryId),
        input.incomeBase,
        progress,
      ).projectedAnnual,
    }));
  return { ...analysis, impact: calcVariableExpensesImpact(input.current, input.incomeBase, progress), topCategories };
}

export type FixedOccurrenceRow = {
  occurrence: FixedExpenseOccurrence;
  expense: FixedExpense | undefined;
  status: OccurrenceStatus;
};

/** Filas de gastos fijos del período: pendientes primero (por fecha), luego pagados. */
export function buildFixedRows(occurrences: readonly FixedExpenseOccurrence[], expenses: readonly FixedExpense[], today: IsoDate): FixedOccurrenceRow[] {
  const byId = new Map(expenses.map((expense) => [expense.id, expense]));
  return occurrences
    .map((occurrence) => ({
      occurrence,
      expense: byId.get(occurrence.fixedExpenseId),
      status: getOccurrenceStatus(occurrence.dueDate, occurrence.status === 'paid', today),
    }))
    .sort((a, b) => Number(a.status === 'paid') - Number(b.status === 'paid') || a.occurrence.dueDate.localeCompare(b.occurrence.dueDate));
}
