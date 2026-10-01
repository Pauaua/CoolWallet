import { percentageOf, roundMoney } from './money';
import { BUDGET_ALERT_THRESHOLDS } from './params';

export type Budget503020 = {
  /** 50%: necesidades. */
  needs: number;
  /** 30%: deseos. */
  wants: number;
  /** 20%: ahorro. */
  savings: number;
};

/**
 * Regla 50/30/20 sobre el ingreso líquido. El ahorro absorbe el redondeo
 * para que la suma sea exactamente el ingreso. Sin ingreso → todo en 0.
 */
export function apply503020(netIncome: number): Budget503020 {
  if (netIncome <= 0) return { needs: 0, wants: 0, savings: 0 };
  const needs = roundMoney(netIncome * 0.5);
  const wants = roundMoney(netIncome * 0.3);
  return { needs, wants, savings: roundMoney(netIncome) - needs - wants };
}

/** % del presupuesto usado; `null` si el límite no es positivo. */
export function calcBudgetUsage(spent: number, limit: number): number | null {
  return percentageOf(spent, limit);
}

/** Cuánto queda del presupuesto (negativo = excedido). */
export function calcBudgetRemaining(spent: number, limit: number): number {
  return roundMoney(limit - spent);
}

export type BudgetAlertLevel = 'none' | 'ok' | 'warning' | 'exceeded';

/** Nivel de alerta: aviso desde el 80% y excedido desde el 100%. `none` sin presupuesto. */
export function getBudgetAlertLevel(usage: number | null): BudgetAlertLevel {
  if (usage === null || Number.isNaN(usage)) return 'none';
  if (usage >= BUDGET_ALERT_THRESHOLDS.exceeded) return 'exceeded';
  if (usage >= BUDGET_ALERT_THRESHOLDS.warning) return 'warning';
  return 'ok';
}

/**
 * Reparte `total` en partes enteras proporcionales a `weights`, sumando
 * exactamente `total` (método del mayor resto). Si todos los pesos son 0,
 * reparte en partes iguales.
 */
export function distributeAmount(total: number, weights: readonly number[]): number[] {
  if (weights.length === 0 || total <= 0) return weights.map(() => 0);
  const safe = weights.map((weight) => Math.max(0, weight));
  const sum = safe.reduce((acc, weight) => acc + weight, 0);
  const normalized = sum > 0 ? safe : safe.map(() => 1);
  const normalizedSum = sum > 0 ? sum : normalized.length;
  const exact = normalized.map((weight) => (total * weight) / normalizedSum);
  const parts = exact.map(Math.floor);
  let leftover = Math.round(total) - parts.reduce((acc, part) => acc + part, 0);
  const order = exact.map((value, index) => ({ index, remainder: value - Math.floor(value) })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of order) {
    if (leftover <= 0) break;
    parts[index] = (parts[index] ?? 0) + 1;
    leftover -= 1;
  }
  return parts;
}

export type BudgetGroupKey = 'needs' | 'wants' | 'savings';

/**
 * Sugerencia de presupuestos por categoría con la regla 50/30/20: el monto
 * de "necesidades" y "deseos" se reparte entre sus categorías según lo
 * gastado el mes anterior (o en partes iguales si no hay historial).
 * El 20% de ahorro no se asigna a categorías: va a metas de ahorro.
 */
export function suggestBudgets503020(
  netIncome: number,
  categories: readonly { id: string; budgetGroup: BudgetGroupKey | null }[],
  previousSpentByCategory: Readonly<Record<string, number>>,
): { limits: { categoryId: string; monthlyLimit: number }[]; savings: number } {
  const split = apply503020(netIncome);
  const limits: { categoryId: string; monthlyLimit: number }[] = [];
  for (const group of ['needs', 'wants'] as const) {
    const members = categories.filter((category) => category.budgetGroup === group);
    const parts = distributeAmount(split[group], members.map((category) => previousSpentByCategory[category.id] ?? 0));
    members.forEach((category, index) => limits.push({ categoryId: category.id, monthlyLimit: parts[index] ?? 0 }));
  }
  return { limits, savings: split.savings };
}
