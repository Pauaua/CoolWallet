import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, Card, EmptyState, ErrorState, Fab, Icon, LoadingState, Screen, SectionHeader, StatCard } from '@/components';
import { DebtCard } from '@/features/debts/DebtCard';
import { DEBT_KIND_OPTIONS } from '@/features/debts/labels';
import { useDebtsSummary } from '@/features/debts/queries';
import { RiskIndicator } from '@/features/debts/RiskIndicator';
import { formatCLP } from '@/lib/finance';
import { useTheme } from '@/theme';

export default function DebtsScreen() {
  const { spacing } = useTheme();
  const debts = useDebtsSummary();

  if (debts.isPending) return <LoadingState />;
  if (debts.isError || !debts.data) return <ErrorState onRetry={() => void debts.refetch()} />;

  const { active, paid, totalDebt, monthlyCommitment, ratio, risk } = debts.data;
  const openDetail = (id: string) => router.push({ pathname: '/deuda/[id]', params: { id } });

  if (active.length === 0 && paid.length === 0) {
    return (
      <EmptyState
        icon="file-text"
        title="Sin deudas registradas"
        description="Agrega tus créditos en cuotas, lo que le debes a alguien o el gasto de la tarjeta para ver cuánto debes y cuándo terminas de pagar."
        action={{ label: 'Agregar deuda', onPress: () => router.push('/deuda-form') }}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="label" color="textSecondary">
            Deuda total
          </AppText>
          <AppText variant="display" accessibilityRole="header">
            {formatCLP(totalDebt)}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatCard icon="calendar" label="Pago mensual comprometido" value={formatCLP(monthlyCommitment)} caption="Suma de tus cuotas" />
          <StatCard icon="trending-down" label="Simulador de pago" value="Ver" caption="Bola de nieve vs avalancha" onPress={() => router.push('/simulador')} />
        </View>
        <RiskIndicator ratio={ratio} risk={risk} />

        {DEBT_KIND_OPTIONS.map((kind) => {
          const items = active.filter((view) => view.debt.kind === kind.value);
          if (items.length === 0) return null;
          return (
            <View key={kind.value} style={{ gap: spacing.sm }}>
              <SectionHeader title={kind.plural} />
              {items.map((view) => (
                <DebtCard key={view.debt.id} view={view} onPress={() => openDetail(view.debt.id)} />
              ))}
            </View>
          );
        })}

        {active.length === 0 ? (
          <Card style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <Icon name="check-circle" color="primary" />
            <AppText>¡No tienes deudas pendientes!</AppText>
          </Card>
        ) : null}

        {paid.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <SectionHeader title="Pagadas" />
            {paid.map((view) => (
              <DebtCard key={view.debt.id} view={view} onPress={() => openDetail(view.debt.id)} />
            ))}
          </View>
        ) : null}
        <View style={{ height: spacing.xxxl + spacing.xl }} />
      </Screen>
      <Fab icon="plus" label="Agregar deuda" onPress={() => router.push('/deuda-form')} />
    </View>
  );
}
