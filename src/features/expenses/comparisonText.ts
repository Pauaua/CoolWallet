import { formatCLP, formatPercent, type PeriodComparison } from '@/lib/finance';

/** "23% más que el mes anterior", "10% menos…", "Igual que…" o "Sin gastos el mes anterior". */
export function describeComparison(comparison: PeriodComparison): string {
  if (comparison.percentage === null) return comparison.difference > 0 ? 'Sin gastos el mes anterior' : 'Sin gastos este mes ni el anterior';
  if (comparison.trend === 'equal') return 'Igual que el mes anterior';
  const direction = comparison.trend === 'up' ? 'más' : 'menos';
  return `${formatPercent(Math.abs(comparison.percentage))} ${direction} que el mes anterior (${comparison.difference > 0 ? '+' : '−'}${formatCLP(Math.abs(comparison.difference))})`;
}
