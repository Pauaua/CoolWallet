import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText, Button, Card, ColorIcon, EmptyState, ErrorState, Fab, Icon, LoadingState, Notice, ProgressBar, Screen, StatCard } from '@/components';
import type { GoalView } from '@/features/goals/goalModel';
import { buildGoalsSummary } from '@/features/goals/goalModel';
import { useSavingsGoals } from '@/features/goals/queries';
import { useBudgetsData } from '@/features/budgets/queries';
import { formatLongDate } from '@/lib/dates';
import { formatCLP, formatPercent, toIsoDate } from '@/lib/finance';
import { useTheme } from '@/theme';

export default function SavingsGoalsScreen() {
  const { spacing } = useTheme();
  const goals = useSavingsGoals();
  const budgets = useBudgetsData();

  if (goals.isPending) return <LoadingState />;
  if (goals.isError) return <ErrorState onRetry={() => void goals.refetch()} />;
  if (goals.data.length === 0) {
    return (
      <EmptyState
        icon="target"
        title="Crea tu primera meta"
        description="Vacaciones, un fondo de emergencia o el pie de algo grande: te diremos cuánto ahorrar cada mes para llegar a tiempo."
        action={{ label: 'Nueva meta', onPress: () => router.push('/meta') }}
      />
    );
  }

  const summary = buildGoalsSummary(goals.data, toIsoDate(new Date()));
  const suggestedSavings = budgets.data?.groups.find((group) => group.group === 'savings')?.target ?? null;

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatCard icon="archive" label="Ahorrado" value={formatCLP(summary.totalSaved)} caption={`de ${formatCLP(summary.totalTarget)}`} />
          <StatCard icon="calendar" label="Ahorro mensual necesario" value={formatCLP(summary.monthlyNeeded)} caption="Para cumplir tus metas a tiempo" />
        </View>
        {suggestedSavings !== null && suggestedSavings > 0 && summary.monthlyNeeded > suggestedSavings ? (
          <Notice tone="warning" message={`Tus metas piden ${formatCLP(summary.monthlyNeeded)} al mes, más que el 20% sugerido de tu ingreso (${formatCLP(suggestedSavings)}). Considera ampliar los plazos.`} />
        ) : null}

        {summary.views.map((view) => (
          <GoalCard key={view.goal.id} view={view} />
        ))}
        <AppText variant="caption" color="textSecondary" align="center">
          Las metas registran cuánto llevas ahorrado; no descuentan dinero de tus cuentas.
        </AppText>
        <View style={{ height: spacing.xxxl + spacing.xl }} />
      </Screen>
      <Fab icon="plus" label="Nueva meta" onPress={() => router.push('/meta')} />
    </View>
  );
}

function GoalCard({ view }: { view: GoalView }) {
  const { spacing } = useTheme();
  const { goal, progress, plan } = view;
  const detail = progress.isComplete
    ? '¡Meta cumplida!'
    : plan === null
      ? `Faltan ${formatCLP(progress.remaining)} · sin fecha objetivo`
      : plan.isOverdue
        ? `La fecha pasó: faltan ${formatCLP(progress.remaining)}`
        : `Ahorra ${formatCLP(plan.monthlyAmount)} al mes por ${plan.monthsRemaining} ${plan.monthsRemaining === 1 ? 'mes' : 'meses'}`;

  return (
    <Card style={{ gap: spacing.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${goal.name}: ${formatCLP(goal.savedAmount)} de ${formatCLP(goal.targetAmount)}, ${formatPercent(progress.percentage)}. ${detail}`}
        accessibilityHint="Editar la meta"
        onPress={() => router.push({ pathname: '/meta', params: { id: goal.id } })}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: pressed ? 0.6 : 1 })}
      >
        <ColorIcon icon={goal.icon} colorKey={goal.color} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{goal.name}</AppText>
          <AppText variant="caption" color="textSecondary">
            {goal.targetDate ? `Para el ${formatLongDate(goal.targetDate)}` : 'Sin fecha objetivo'}
          </AppText>
        </View>
        <AppText variant="bodyStrong">{formatPercent(progress.percentage)}</AppText>
      </Pressable>
      <ProgressBar value={progress.percentage} accessibilityLabel={`Avance de ${goal.name}`} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="caption" color="textSecondary">
          {formatCLP(goal.savedAmount)} de {formatCLP(goal.targetAmount)}
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
        <Icon name={progress.isComplete ? 'award' : plan?.isOverdue ? 'alert-triangle' : 'trending-up'} size={16} color={progress.isComplete ? 'primary' : plan?.isOverdue ? 'warningText' : 'textSecondary'} />
        <AppText variant="caption" color={progress.isComplete ? 'primary' : plan?.isOverdue ? 'warningText' : 'textSecondary'} style={{ flex: 1 }}>
          {detail}
        </AppText>
      </View>
      {!progress.isComplete ? <Button label="Registrar aporte" variant="secondary" icon="plus" onPress={() => router.push({ pathname: '/aporte', params: { goalId: goal.id } })} /> : null}
    </Card>
  );
}
