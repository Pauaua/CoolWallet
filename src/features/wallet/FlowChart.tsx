import { View } from 'react-native';

import { AppText } from '@/components';
import { formatCLP, type PeriodFlow } from '@/lib/finance';
import { useTheme, type ColorTokens } from '@/theme';

type FlowChartProps = {
  flow: PeriodFlow;
};

const SERIES: readonly { key: 'income' | 'expenses' | 'debtPayments'; label: string; color: keyof ColorTokens }[] = [
  { key: 'income', label: 'Ingresos', color: 'chartIncome' },
  { key: 'expenses', label: 'Gastos', color: 'chartExpense' },
  { key: 'debtPayments', label: 'Pagos de deuda', color: 'chartDebt' },
];

/**
 * Flujo del mes en barras horizontales: comparar tres magnitudes. Cada barra
 * lleva su etiqueta y monto al lado (no depende solo del color), y cada fila
 * se lee completa con lector de pantalla.
 */
export function FlowChart({ flow }: FlowChartProps) {
  const { colors, spacing } = useTheme();
  const max = Math.max(1, flow.income, flow.expenses, flow.debtPayments);

  return (
    <View style={{ gap: spacing.md }} accessibilityLabel="Flujo del mes">
      {SERIES.map((series) => {
        const value = flow[series.key];
        const widthPercent = value > 0 ? Math.max(2, (value / max) * 100) : 0;
        return (
          <View key={series.key} accessible accessibilityLabel={`${series.label}: ${formatCLP(value)}`} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors[series.color] }} />
                <AppText variant="label" color="textSecondary">
                  {series.label}
                </AppText>
              </View>
              <AppText variant="bodyStrong">{formatCLP(value)}</AppText>
            </View>
            <View style={{ height: 12, borderRadius: 4, backgroundColor: colors.background }}>
              <View style={{ width: `${widthPercent}%`, height: '100%', borderRadius: 4, backgroundColor: colors[series.color] }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
