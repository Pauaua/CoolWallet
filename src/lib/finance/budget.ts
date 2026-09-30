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
