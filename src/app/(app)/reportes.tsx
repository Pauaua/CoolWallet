import { useState } from 'react';
import { View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';

import { AppText, Button, Card, Divider, EmptyState, ErrorState, Icon, LoadingState, Notice, Screen, SectionHeader, SegmentedControl } from '@/components';
import type { Insight } from '@/features/reports/insights';
import type { MonthReport } from '@/features/reports/reportsModel';
import { useExportCsv, useReports } from '@/features/reports/useReports';
import { formatCLP, formatCompactCLP, formatPercent, isDateInPeriod, sumAmounts } from '@/lib/finance';
import { useTheme, type ColorTokens } from '@/theme';

const SERIES: readonly { key: 'income' | 'expenses' | 'debtPayments'; label: string; color: keyof ColorTokens }[] = [
  { key: 'income', label: 'Ingresos', color: 'chartIncome' },
  { key: 'expenses', label: 'Gastos', color: 'chartExpense' },
  { key: 'debtPayments', label: 'Pagos de deuda', color: 'chartDebt' },
];
const BAR_WIDTH = 10;
const INSIGHT_ICON: Record<Insight['tone'], { icon: 'trending-up' | 'alert-triangle' | 'info'; color: keyof ColorTokens }> = {
  positive: { icon: 'trending-up', color: 'primary' },
  warning: { icon: 'alert-triangle', color: 'warningText' },
  neutral: { icon: 'info', color: 'textSecondary' },
};

type CsvRange = 'month' | 'six' | 'all';

export default function ReportsScreen() {
  const { colors, spacing, typography } = useTheme();
  const reports = useReports();
  const exportCsv = useExportCsv();
  const [csvRange, setCsvRange] = useState<CsvRange>('month');

  if (reports.isPending) return <LoadingState />;
  if (reports.isError || !reports.data) return <ErrorState onRetry={() => void reports.refetch()} />;

  const { reports: months, insights, transactions, categories, accounts } = reports.data;
  const hasData = months.some((month) => month.income + month.expenses + month.debtPayments > 0);
  if (!hasData) {
    return <EmptyState icon="bar-chart-2" title="Aún no hay datos para reportes" description="Registra tu sueldo y tus gastos durante el mes y aquí verás tu evolución y consejos automáticos." />;
  }

  const axisText = { ...typography.caption, color: colors.textSecondary };
  const barData = months.flatMap((month) =>
    SERIES.map((series, index) => ({
      value: month[series.key],
      frontColor: colors[series.color],
      spacing: index === SERIES.length - 1 ? 16 : 2,
      ...(index === 0 ? { label: month.label, labelWidth: BAR_WIDTH * 3 + 4, labelTextStyle: axisText } : {}),
    })),
  );
  const hasDebt = months.some((month) => month.debtAtEnd > 0);
  const lineData = months.map((month) => ({ value: month.debtAtEnd, label: month.label, labelTextStyle: axisText }));
  const csvTransactions =
    csvRange === 'all'
      ? transactions
      : transactions.filter((tx) => (csvRange === 'month' ? isDateInPeriod(tx.date, months[months.length - 1]!.period) : tx.date >= months[0]!.period.start));
  const savingsValues = months.map((month) => month.savingsRate).filter((rate): rate is number => rate !== null);
  const averageSavings = savingsValues.length > 0 ? sumAmounts(savingsValues) / savingsValues.length : null;

  return (
    <Screen>
      {insights.length > 0 ? (
        <>
          <SectionHeader title="Lo que vemos este mes" />
          <Card style={{ gap: spacing.md }}>
            {insights.map((insight, index) => (
              <View key={insight.id} style={{ gap: spacing.md }}>
                {index > 0 ? <Divider /> : null}
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Icon name={INSIGHT_ICON[insight.tone].icon} color={INSIGHT_ICON[insight.tone].color} />
                  <AppText style={{ flex: 1 }}>{insight.text}</AppText>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader title="Últimos 6 meses" />
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {SERIES.map((series) => (
            <View key={series.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors[series.color] }} />
              <AppText variant="caption" color="textSecondary">
                {series.label}
              </AppText>
            </View>
          ))}
        </View>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ overflow: 'hidden' }}>
          <BarChart
            data={barData}
            barWidth={BAR_WIDTH}
            barBorderTopLeftRadius={4}
            barBorderTopRightRadius={4}
            initialSpacing={8}
            noOfSections={4}
            height={180}
            yAxisThickness={0}
            xAxisColor={colors.border}
            rulesColor={colors.border}
            yAxisTextStyle={axisText}
            yAxisLabelWidth={64}
            formatYLabel={(label) => formatCompactCLP(Number(label))}
            disableScroll
          />
        </View>
        <MonthsTable months={months} />
        <AppText variant="caption" color="textSecondary">
          Tasa de ahorro promedio: {formatPercent(averageSavings)} (ingresos menos gastos y pagos de deuda).
        </AppText>
      </Card>

      {hasDebt ? (
        <>
          <SectionHeader title="Evolución de tu deuda" />
          <Card style={{ gap: spacing.md }}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ overflow: 'hidden' }}>
              <LineChart
                data={lineData}
                color={colors.chartDebt}
                thickness={2}
                dataPointsColor={colors.chartDebt}
                dataPointsRadius={4}
                height={160}
                spacing={48}
                initialSpacing={12}
                noOfSections={4}
                yAxisThickness={0}
                xAxisColor={colors.border}
                rulesColor={colors.border}
                yAxisTextStyle={axisText}
                yAxisLabelWidth={64}
                formatYLabel={(label) => formatCompactCLP(Number(label))}
                disableScroll
              />
            </View>
            {months.map((month) => (
              <View key={month.period.start} accessible accessibilityLabel={`${month.label}: deuda ${formatCLP(month.debtAtEnd)}`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText color="textSecondary" style={{ textTransform: 'capitalize' }}>
                  {month.label}
                </AppText>
                <AppText>{formatCLP(month.debtAtEnd)}</AppText>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader title="Exportar movimientos" />
      <Card style={{ gap: spacing.md }}>
        <SegmentedControl
          accessibilityLabel="Rango a exportar"
          options={[
            { value: 'month', label: 'Este mes' },
            { value: 'six', label: '6 meses' },
            { value: 'all', label: 'Todo' },
          ]}
          value={csvRange}
          onChange={setCsvRange}
        />
        <AppText variant="caption" color="textSecondary">
          {csvTransactions.length} movimientos en un archivo CSV que puedes abrir en Excel o Google Sheets.
        </AppText>
        <Button label="Exportar a CSV" icon="file-text" variant="secondary" loading={exportCsv.isPending} onPress={() => exportCsv.mutate({ transactions: csvTransactions, categories, accounts })} />
        {exportCsv.isError ? <Notice tone="danger" message={exportCsv.error instanceof Error ? exportCsv.error.message : 'No pudimos exportar.'} /> : null}
      </Card>
    </Screen>
  );
}

/** Vista en tabla de la evolución (accesible y sin depender del gráfico). */
function MonthsTable({ months }: { months: readonly MonthReport[] }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {['Mes', 'Ingresos', 'Gastos', 'Ahorro'].map((header, index) => (
          <AppText key={header} variant="caption" color="textSecondary" style={{ flex: index === 0 ? 0.8 : 1, textAlign: index === 0 ? 'left' : 'right' }}>
            {header}
          </AppText>
        ))}
      </View>
      {months.map((month) => (
        <View
          key={month.period.start}
          accessible
          accessibilityLabel={`${month.label}: ingresos ${formatCLP(month.income)}, gastos ${formatCLP(month.expenses)}, pagos de deuda ${formatCLP(month.debtPayments)}, ahorro ${formatPercent(month.savingsRate)}`}
          style={{ flexDirection: 'row' }}
        >
          <AppText variant="caption" style={{ flex: 0.8, textTransform: 'capitalize' }}>
            {month.label}
          </AppText>
          <AppText variant="caption" style={{ flex: 1, textAlign: 'right' }}>
            {formatCompactCLP(month.income)}
          </AppText>
          <AppText variant="caption" style={{ flex: 1, textAlign: 'right' }}>
            {formatCompactCLP(month.expenses + month.debtPayments)}
          </AppText>
          <AppText variant="caption" style={{ flex: 1, textAlign: 'right' }}>
            {formatPercent(month.savingsRate)}
          </AppText>
        </View>
      ))}
    </View>
  );
}
