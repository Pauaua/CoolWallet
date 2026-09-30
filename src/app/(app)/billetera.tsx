import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, Button, Card, Divider, ErrorState, LoadingState, ProgressBar, Screen, SectionHeader, StatCard } from '@/components';
import { useCategories } from '@/features/categories/queries';
import { AccountRow } from '@/features/wallet/AccountRow';
import { FlowChart } from '@/features/wallet/FlowChart';
import { MovementRow } from '@/features/wallet/MovementRow';
import { SalaryPendingCard } from '@/features/wallet/SalaryPendingCard';
import { useWalletSummary } from '@/features/wallet/useWalletSummary';
import { formatPeriodRange } from '@/lib/dates';
import { formatCLP, formatPercent, getBudgetAlertLevel, type BudgetAlertLevel } from '@/lib/finance';
import { useTheme, type ColorTokens } from '@/theme';

const RECENT_COUNT = 5;

/** Color de la barra según cuánto del ingreso se ha gastado (alerta al 80% y 100%). */
const SPENT_TONES: Record<BudgetAlertLevel, keyof ColorTokens> = { none: 'accent', ok: 'accent', warning: 'warning', exceeded: 'danger' };

export default function WalletScreen() {
  const { spacing } = useTheme();
  const wallet = useWalletSummary();
  const categories = useCategories();

  if (wallet.isPending) return <LoadingState />;
  if (wallet.isError || !wallet.data) return <ErrorState onRetry={() => void wallet.refetch()} />;

  const { summary, netSalary } = wallet.data;
  const categoryById = new Map((categories.data ?? []).map((category) => [category.id, category]));
  const accountById = new Map(summary.accounts.map((account) => [account.id, account]));
  const recent = summary.periodTransactions.slice(0, RECENT_COUNT);
  const spentTone = SPENT_TONES[getBudgetAlertLevel(summary.spentPercentage)];

  return (
    <Screen>
      {/* Disponible */}
      <View style={{ gap: spacing.xs, paddingVertical: spacing.sm }}>
        <AppText variant="label" color="textSecondary">
          Dinero disponible hoy
        </AppText>
        <AppText variant="display" color={summary.available < 0 ? 'danger' : 'text'} accessibilityRole="header">
          {formatCLP(summary.available)}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          Suma de tus {summary.accounts.length === 1 ? 'cuenta' : `${summary.accounts.length} cuentas`} · Mes financiero {formatPeriodRange(summary.period.start, summary.period.end)}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button label="Ingreso extra" icon="plus" variant="secondary" onPress={() => router.push('/nuevo-ingreso')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Ajustar saldo" icon="sliders" variant="secondary" onPress={() => router.push('/ajustar-saldo')} />
        </View>
      </View>

      {summary.salaryPending ? <SalaryPendingCard expectedSalary={netSalary.net} accounts={summary.accounts} /> : null}

      {/* Gasto del mes */}
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="caption" color="textSecondary">
              Gastado este mes
            </AppText>
            <AppText variant="amount">{formatCLP(summary.spent)}</AppText>
          </View>
          <AppText variant="bodyStrong" color="textSecondary">
            {summary.spentPercentage === null ? 'Sin ingreso' : `${formatPercent(summary.spentPercentage)} del ingreso`}
          </AppText>
        </View>
        <ProgressBar value={summary.spentPercentage ?? 0} color={spentTone} accessibilityLabel="Porcentaje del ingreso gastado" />
        <AppText variant="caption" color="textSecondary">
          Ingreso del mes: {formatCLP(summary.incomeBase)}
          {summary.pendingIncome > 0 ? ' (incluye tu sueldo por registrar)' : ''}
        </AppText>
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <StatCard icon="sun" label="Puedes gastar por día" value={formatCLP(summary.safeDailySpend)} caption={`Durante ${summary.daysRemaining} ${summary.daysRemaining === 1 ? 'día' : 'días'} más`} />
        <StatCard icon="activity" label="Promedio diario" value={formatCLP(summary.dailyAverage)} caption={`En ${summary.daysElapsed} ${summary.daysElapsed === 1 ? 'día' : 'días'}`} />
      </View>
      <StatCard
        icon="trending-up"
        label="Proyección al cierre del mes"
        value={formatCLP(summary.projectedClosingBalance)}
        valueColor={summary.projectedClosingBalance < 0 ? 'danger' : 'text'}
        caption={summary.projectedClosingBalance < 0 ? 'A este ritmo terminarías el mes en negativo.' : 'Lo que te quedaría si sigues gastando a este ritmo.'}
      />

      <SectionHeader title="Flujo del mes" />
      <Card>
        <FlowChart flow={summary.flow} />
      </Card>

      <SectionHeader title="Cuentas" action={{ label: 'Agregar', onPress: () => router.push('/cuenta') }} />
      <Card style={{ paddingVertical: spacing.sm }}>
        {summary.accounts.length === 0 ? (
          <AppText color="textSecondary">Agrega tu cuenta corriente, efectivo o tarjeta para ver tu dinero real.</AppText>
        ) : (
          summary.accounts.map((account, index) => (
            <View key={account.id}>
              {index > 0 ? <Divider /> : null}
              <AccountRow account={account} onPress={() => router.push({ pathname: '/cuenta', params: { id: account.id } })} />
            </View>
          ))
        )}
      </Card>

      <SectionHeader title="Movimientos del mes" action={{ label: 'Ver historial', onPress: () => router.push('/historial') }} />
      <Card style={{ paddingVertical: spacing.sm }}>
        {recent.length === 0 ? (
          <AppText color="textSecondary">Aún no hay movimientos en este mes financiero.</AppText>
        ) : (
          recent.map((transaction, index) => (
            <View key={transaction.id}>
              {index > 0 ? <Divider /> : null}
              <MovementRow
                transaction={transaction}
                category={transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined}
                account={transaction.accountId ? accountById.get(transaction.accountId) : undefined}
                onPress={() => router.push({ pathname: '/movimiento/[id]', params: { id: transaction.id } })}
              />
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
