import { router } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { AppText, Button, Card, ColorIcon, Divider, ErrorState, Fab, Icon, LoadingState, Notice, ProgressBar, Screen, SectionHeader } from '@/components';
import type { BudgetRow } from '@/features/budgets/budgetModel';
import { BUDGET_GROUP_LABELS, BUDGET_LEVEL_META } from '@/features/budgets/labels';
import { useBudgetsData, useUpsertManyBudgets } from '@/features/budgets/queries';
import { formatCLP, formatPercent, getBudgetAlertLevel, suggestBudgets503020 } from '@/lib/finance';
import { useTheme } from '@/theme';

export default function BudgetsScreen() {
  const { spacing } = useTheme();
  const budgets = useBudgetsData();
  const applyMany = useUpsertManyBudgets();

  if (budgets.isPending) return <LoadingState />;
  if (budgets.isError || !budgets.data) return <ErrorState onRetry={() => void budgets.refetch()} />;

  const { rows, totals, groups, netIncome, categories, previousSpentByCategory } = budgets.data;
  const expenseCategories = categories.filter((category) => category.kind !== 'income');

  const applySuggestion = () => {
    const suggestion = suggestBudgets503020(netIncome, expenseCategories, previousSpentByCategory);
    Alert.alert(
      '¿Aplicar la regla 50/30/20?',
      `Se crearán o actualizarán ${suggestion.limits.length} presupuestos repartiendo ${formatCLP(netIncome - suggestion.savings)} entre tus categorías de necesidades y deseos, según lo que gastaste el mes anterior. El ${BUDGET_GROUP_LABELS.savings.percent}% (${formatCLP(suggestion.savings)}) queda para ahorro.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Aplicar', onPress: () => applyMany.mutate(suggestion.limits) },
      ],
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        {rows.length > 0 ? (
          <Card style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View style={{ gap: spacing.xs }}>
                <AppText variant="caption" color="textSecondary">
                  Gastado de tus presupuestos
                </AppText>
                <AppText variant="amount">
                  {formatCLP(totals.spent)} <AppText color="textSecondary">de {formatCLP(totals.limit)}</AppText>
                </AppText>
              </View>
            </View>
            <ProgressBar value={totals.usage ?? 0} color={BUDGET_LEVEL_META[getBudgetAlertLevel(totals.usage)].bar} accessibilityLabel="Uso total de los presupuestos" />
            {totals.alerts > 0 ? (
              <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
                <Icon name="alert-triangle" size={16} color="warningText" />
                <AppText variant="caption" color="warningText">
                  {totals.alerts === 1 ? '1 presupuesto llegó al 80% o más' : `${totals.alerts} presupuestos llegaron al 80% o más`}
                </AppText>
              </View>
            ) : null}
          </Card>
        ) : (
          <Card style={{ gap: spacing.sm }}>
            <AppText variant="heading">Pon límites a tus gastos</AppText>
            <AppText color="textSecondary">Crea un presupuesto mensual por categoría y te avisaremos al llegar al 80% y al 100%. Puedes partir con la regla 50/30/20.</AppText>
          </Card>
        )}

        {rows.map((row) => (
          <BudgetRowCard key={row.budget.id} row={row} />
        ))}

        <SectionHeader title="Regla 50/30/20" />
        <Card style={{ gap: spacing.md }}>
          {netIncome > 0 ? (
            <>
              <AppText variant="caption" color="textSecondary">
                Sobre tu ingreso líquido de {formatCLP(netIncome)}. Cada categoría pertenece a un grupo (lo cambias en Categorías).
              </AppText>
              {groups.map((group, index) => {
                const meta = BUDGET_GROUP_LABELS[group.group];
                const over = group.group !== 'savings' && group.actual > group.target;
                return (
                  <View key={group.group} style={{ gap: spacing.xs }}>
                    {index > 0 ? <Divider /> : null}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <AppText variant="bodyStrong">
                        {meta.label} · {meta.percent}%
                      </AppText>
                      <AppText variant="bodyStrong" color={over ? 'danger' : 'text'}>
                        {formatCLP(group.actual)} / {formatCLP(group.target)}
                      </AppText>
                    </View>
                    <ProgressBar value={group.usage ?? 0} color={over ? 'danger' : 'accent'} accessibilityLabel={`${meta.label}: ${formatPercent(group.usage)} del objetivo`} height={8} />
                    <AppText variant="caption" color="textSecondary">
                      {group.group === 'savings' ? 'Ingreso menos todos tus gastos del mes.' : meta.description}
                      {over ? ` Te pasaste por ${formatCLP(group.actual - group.target)}.` : ''}
                    </AppText>
                  </View>
                );
              })}
              <Button label="Aplicar sugerencia 50/30/20" variant="secondary" icon="zap" loading={applyMany.isPending} onPress={applySuggestion} />
            </>
          ) : (
            <Notice message="Completa tu sueldo en el perfil para calcular la regla 50/30/20." />
          )}
        </Card>
        {applyMany.isError ? <Notice tone="danger" message="No pudimos aplicar la sugerencia. Intenta de nuevo." /> : null}
        <View style={{ height: spacing.xxxl + spacing.xl }} />
      </Screen>
      <Fab icon="plus" label="Nuevo presupuesto" onPress={() => router.push('/presupuesto')} />
    </View>
  );
}

function BudgetRowCard({ row }: { row: BudgetRow }) {
  const { spacing } = useTheme();
  const meta = BUDGET_LEVEL_META[row.level];
  const name = row.category?.name ?? 'Categoría eliminada';
  const status =
    row.level === 'exceeded'
      ? `Te pasaste por ${formatCLP(-row.remaining)}`
      : row.level === 'warning'
        ? `Llegaste al ${formatPercent(row.usage)} · quedan ${formatCLP(row.remaining)}`
        : `Quedan ${formatCLP(row.remaining)}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}: gastado ${formatCLP(row.spent)} de ${formatCLP(row.budget.monthlyLimit)}. ${status}`}
      accessibilityHint="Editar el presupuesto"
      onPress={() => router.push({ pathname: '/presupuesto', params: { categoryId: row.budget.categoryId } })}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <ColorIcon icon={row.category?.icon ?? 'tag'} colorKey={row.category?.color ?? 'sage'} size={36} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">{name}</AppText>
            <AppText variant="caption" color="textSecondary">
              {formatCLP(row.spent)} de {formatCLP(row.budget.monthlyLimit)}
            </AppText>
          </View>
          <AppText variant="bodyStrong">{formatPercent(row.usage)}</AppText>
        </View>
        <ProgressBar value={row.usage ?? 0} color={meta.bar} accessibilityLabel={`Uso del presupuesto de ${name}`} height={8} />
        <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
          <Icon name={meta.icon} size={14} color={meta.text} />
          <AppText variant="caption" color={meta.text}>
            {status}
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}
