import {
  calcCategoryBreakdown,
  compareCategoriesWithPrevious,
  formatCLP,
  formatPercent,
  UNCATEGORIZED,
  type CategoryShare,
} from '@/lib/finance';
import type { Category, Transaction } from '@/types/models';

import type { MonthReport } from './reportsModel';

export type Insight = {
  id: string;
  tone: 'positive' | 'warning' | 'neutral';
  text: string;
};

/** Variación mínima para comentar una categoría (evita ruido con montos chicos). */
const MIN_CHANGE_PERCENT = 15;
const MIN_CHANGE_AMOUNT = 5_000;
const MAX_INSIGHTS = 5;

/**
 * Observaciones automáticas en texto simple a partir del mes actual y el anterior.
 * Ej.: "Este mes gastaste 23% más en Delivery que el anterior."
 */
export function generateInsights(input: {
  current: MonthReport;
  previous: MonthReport | undefined;
  currentExpenses: readonly Transaction[];
  previousExpenses: readonly Transaction[];
  categories: readonly Category[];
}): Insight[] {
  const names = new Map(input.categories.map((category) => [category.id, category.name]));
  const nameOf = (share: Pick<CategoryShare, 'categoryId'>) => (share.categoryId === UNCATEGORIZED ? 'gastos sin categoría' : (names.get(share.categoryId) ?? 'una categoría eliminada'));
  const insights: Insight[] = [];

  const current = calcCategoryBreakdown(input.currentExpenses);
  const changes = compareCategoriesWithPrevious(current, calcCategoryBreakdown(input.previousExpenses)).filter(
    (change) => change.previous > 0 && change.percentage !== null && Math.abs(change.percentage) >= MIN_CHANGE_PERCENT && Math.abs(change.difference) >= MIN_CHANGE_AMOUNT,
  );
  const rise = changes.find((change) => change.trend === 'up');
  if (rise?.percentage) {
    insights.push({ id: `rise-${rise.categoryId}`, tone: 'warning', text: `Este mes gastaste ${formatPercent(rise.percentage)} más en ${nameOf(rise)} que el anterior (+${formatCLP(rise.difference)}).` });
  }
  const drop = [...changes].reverse().find((change) => change.trend === 'down');
  if (drop?.percentage) {
    insights.push({ id: `drop-${drop.categoryId}`, tone: 'positive', text: `Bien: gastaste ${formatPercent(Math.abs(drop.percentage))} menos en ${nameOf(drop)} que el mes anterior.` });
  }

  const top = current[0];
  if (top && top.percentage >= 25) {
    insights.push({ id: `top-${top.categoryId}`, tone: 'neutral', text: `Tu mayor gasto del mes es ${nameOf(top)}: ${formatPercent(top.percentage)} de todo lo que gastaste.` });
  }

  const rate = input.current.savingsRate;
  if (rate !== null) {
    if (rate < 0) {
      insights.push({ id: 'savings-negative', tone: 'warning', text: `Este mes estás gastando más de lo que ganas: ${formatCLP(input.current.expenses + input.current.debtPayments - input.current.income)} por sobre tus ingresos.` });
    } else {
      const previousRate = input.previous?.savingsRate ?? null;
      const comparison = previousRate === null ? '' : rate > previousRate ? ` (mejor que el ${formatPercent(previousRate)} del mes anterior)` : rate < previousRate ? ` (el mes anterior fue ${formatPercent(previousRate)})` : '';
      insights.push({ id: 'savings-rate', tone: rate >= 20 ? 'positive' : 'neutral', text: `Tu tasa de ahorro este mes va en ${formatPercent(rate)}${comparison}.` });
    }
  }

  if (input.previous && input.previous.debtAtEnd > input.current.debtAtEnd) {
    insights.push({ id: 'debt-down', tone: 'positive', text: `Tu deuda total bajó ${formatCLP(input.previous.debtAtEnd - input.current.debtAtEnd)} desde el mes anterior.` });
  } else if (input.previous && input.current.debtAtEnd > input.previous.debtAtEnd) {
    insights.push({ id: 'debt-up', tone: 'warning', text: `Tu deuda total subió ${formatCLP(input.current.debtAtEnd - input.previous.debtAtEnd)} desde el mes anterior.` });
  }

  return insights.slice(0, MAX_INSIGHTS);
}
