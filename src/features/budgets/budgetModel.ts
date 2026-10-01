import {
  apply503020,
  calcBudgetRemaining,
  calcBudgetUsage,
  getBudgetAlertLevel,
  sumAmounts,
  sumByCategory,
  type BudgetAlertLevel,
  type BudgetGroupKey,
} from '@/lib/finance';
import type { Budget, Category, Transaction } from '@/types/models';

export type BudgetRow = {
  budget: Budget;
  category: Category | undefined;
  spent: number;
  usage: number | null;
  remaining: number;
  level: BudgetAlertLevel;
};

/** Filas de presupuesto con lo gastado en el período, de mayor a menor uso. */
export function buildBudgetRows(budgets: readonly Budget[], categories: readonly Category[], periodExpenses: readonly Transaction[]): BudgetRow[] {
  const spentByCategory = sumByCategory(periodExpenses);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  return budgets
    .map((budget) => {
      const spent = spentByCategory[budget.categoryId] ?? 0;
      const usage = calcBudgetUsage(spent, budget.monthlyLimit);
      return {
        budget,
        category: categoryById.get(budget.categoryId),
        spent,
        usage,
        remaining: calcBudgetRemaining(spent, budget.monthlyLimit),
        level: getBudgetAlertLevel(usage),
      };
    })
    .sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0));
}

export type BudgetTotals = { limit: number; spent: number; usage: number | null; alerts: number };

export function calcBudgetTotals(rows: readonly BudgetRow[]): BudgetTotals {
  const limit = sumAmounts(rows.map((row) => row.budget.monthlyLimit));
  const spent = sumAmounts(rows.map((row) => row.spent));
  return { limit, spent, usage: calcBudgetUsage(spent, limit), alerts: rows.filter((row) => row.level === 'warning' || row.level === 'exceeded').length };
}

export type GroupComparison = { group: BudgetGroupKey; target: number; actual: number; usage: number | null };

/**
 * Regla 50/30/20 frente a lo real: necesidades y deseos = gastos de sus
 * categorías; ahorro = ingreso − todos los gastos (nunca negativo).
 */
export function compareWith503020(netIncome: number, categories: readonly Category[], periodExpenses: readonly Transaction[]): GroupComparison[] {
  const targets = apply503020(netIncome);
  const groupById = new Map(categories.map((category) => [category.id, category.budgetGroup]));
  const spentIn = (group: BudgetGroupKey) => sumAmounts(periodExpenses.filter((tx) => tx.categoryId && groupById.get(tx.categoryId) === group).map((tx) => tx.amount));
  const totalSpent = sumAmounts(periodExpenses.map((tx) => tx.amount));
  const actual: Record<BudgetGroupKey, number> = {
    needs: spentIn('needs'),
    wants: spentIn('wants'),
    savings: Math.max(0, netIncome - totalSpent),
  };
  return (['needs', 'wants', 'savings'] as const).map((group) => ({ group, target: targets[group], actual: actual[group], usage: calcBudgetUsage(actual[group], targets[group]) }));
}

/**
 * Si un gasto nuevo hace que el presupuesto cruce un umbral (80% o 100%),
 * devuelve el nuevo nivel; si no cambia de nivel, `null`.
 */
export function detectBudgetCrossing(spentBefore: number, amount: number, limit: number): BudgetAlertLevel | null {
  const before = getBudgetAlertLevel(calcBudgetUsage(spentBefore, limit));
  const after = getBudgetAlertLevel(calcBudgetUsage(spentBefore + amount, limit));
  return after !== before && (after === 'warning' || after === 'exceeded') ? after : null;
}
