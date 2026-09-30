import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { AppText, Card, Divider, EmptyState, ErrorState, Fab, LoadingState, ProgressBar, Screen, SectionHeader, SegmentedControl } from '@/components';
import { CategoryDonut } from '@/features/expenses/CategoryDonut';
import { describeComparison } from '@/features/expenses/comparisonText';
import { FREQUENCY_OPTIONS } from '@/features/expenses/labels';
import { OccurrenceRow } from '@/features/expenses/OccurrenceRow';
import { useMarkOccurrencePaid, useMarkOccurrencePending } from '@/features/expenses/queries';
import { useExpensesData } from '@/features/expenses/useExpensesData';
import { MovementRow } from '@/features/wallet/MovementRow';
import { formatShortDate } from '@/lib/dates';
import { formatCLP, formatPercent, getNextRecurringDueDate } from '@/lib/finance';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

type Tab = 'fixed' | 'variable';
const RECENT_VARIABLE = 10;

export default function ExpensesScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'variable' ? 'variable' : 'fixed');
  const { spacing } = useTheme();
  const expenses = useExpensesData();

  if (expenses.isPending) return <LoadingState />;
  if (expenses.isError || !expenses.data) return <ErrorState onRetry={() => void expenses.refetch()} />;

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <SegmentedControl
          accessibilityLabel="Tipo de gasto"
          options={[
            { value: 'fixed', label: 'Fijos' },
            { value: 'variable', label: 'Variables' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'fixed' ? <FixedTab data={expenses.data} today={expenses.today} /> : <VariableTab data={expenses.data} today={expenses.today} />}
        {/* Espacio para que el botón flotante no tape el último elemento. */}
        <View style={{ height: spacing.xxxl + spacing.xl }} />
      </Screen>
      {tab === 'fixed' ? (
        <Fab icon="plus" label="Gasto fijo" onPress={() => router.push('/gasto-fijo')} />
      ) : (
        <Fab icon="plus" label="Registrar gasto" onPress={() => router.push('/gasto-rapido')} />
      )}
    </View>
  );
}

type ExpensesData = NonNullable<ReturnType<typeof useExpensesData>['data']>;

function FixedTab({ data, today }: { data: ExpensesData; today: string }) {
  const { spacing } = useTheme();
  const markPaid = useMarkOccurrencePaid();
  const markPending = useMarkOccurrencePending();
  const { fixedProgress, fixedRows, fixedExpenses, fixedAnalysis, categoryById, accounts } = data;
  const busy = markPaid.isPending || markPending.isPending;

  if (fixedExpenses.length === 0) {
    return (
      <EmptyState
        icon="repeat"
        title="Agrega tus gastos fijos"
        description="Arriendo, cuentas básicas, internet, suscripciones… Se generan solos cada mes y solo tienes que marcarlos como pagados."
        action={{ label: 'Agregar gasto fijo', onPress: () => router.push('/gasto-fijo') }}
      />
    );
  }

  const toggle = (row: (typeof fixedRows)[number]) => {
    if (row.status === 'paid') {
      Alert.alert('¿Marcar como pendiente?', 'Se eliminará el pago registrado y el saldo de la cuenta se recalculará.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Marcar pendiente', style: 'destructive', onPress: () => markPending.mutate(row.occurrence.id) },
      ]);
      return;
    }
    markPaid.mutate({
      occurrenceId: row.occurrence.id,
      payment: { accountId: row.expense?.accountId ?? accounts[0]?.id ?? null, date: today, amount: row.occurrence.amount },
    });
  };

  return (
    <>
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="caption" color="textSecondary">
              Gastos fijos del mes
            </AppText>
            <AppText variant="amount">{formatCLP(fixedProgress.total)}</AppText>
          </View>
          <AppText variant="label" color="textSecondary">
            {fixedProgress.paidCount} de {fixedProgress.paidCount + fixedProgress.pendingCount} pagados
          </AppText>
        </View>
        <ProgressBar value={fixedProgress.paidPercentage} accessibilityLabel="Porcentaje de gastos fijos pagados" />
        <AppText variant="caption" color="textSecondary">
          Pagado {formatCLP(fixedProgress.paid)} · Por pagar {formatCLP(fixedProgress.pending)}
        </AppText>
      </Card>

      {markPaid.isError || markPending.isError ? (
        <AppText variant="caption" color="danger">
          No pudimos actualizar el pago. Intenta de nuevo.
        </AppText>
      ) : null}

      <SectionHeader title="Este mes" />
      <Card style={{ paddingVertical: spacing.xs }}>
        {fixedRows.length === 0 ? (
          <AppText color="textSecondary">No tienes gastos fijos que venzan en este mes financiero.</AppText>
        ) : (
          fixedRows.map((row, index) => (
            <View key={row.occurrence.id}>
              {index > 0 ? <Divider /> : null}
              <OccurrenceRow
                row={row}
                today={today}
                busy={busy}
                category={row.expense?.categoryId ? categoryById.get(row.expense.categoryId) : undefined}
                onTogglePaid={() => toggle(row)}
                onPress={() => router.push({ pathname: '/gasto-fijo', params: { id: row.occurrence.fixedExpenseId } })}
              />
            </View>
          ))
        )}
      </Card>

      <SectionHeader title="Todos tus gastos fijos" />
      <Card style={{ paddingVertical: spacing.sm, gap: spacing.sm }}>
        {fixedExpenses.map((expense, index) => {
          const next = getNextRecurringDueDate(expense, today);
          const frequency = FREQUENCY_OPTIONS.find((option) => option.value === expense.frequency)?.label ?? '';
          return (
            <View key={expense.id} style={{ gap: spacing.sm }}>
              {index > 0 ? <Divider /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityHint="Editar el gasto fijo"
                onPress={() => router.push({ pathname: '/gasto-fijo', params: { id: expense.id } })}
                style={({ pressed }) => ({ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', opacity: pressed ? 0.6 : 1 })}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{expense.name}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {expense.active ? `${frequency} · día ${expense.dueDay}${next ? ` · próximo ${formatShortDate(next)}` : ''}` : 'Pausado'}
                  </AppText>
                </View>
                <AppText variant="bodyStrong">{formatCLP(expense.amount)}</AppText>
              </Pressable>
            </View>
          );
        })}
      </Card>

      {fixedAnalysis.total > 0 ? (
        <>
          <SectionHeader title="Pagado por categoría" />
          <Card style={{ gap: spacing.md }}>
            <CategoryDonut shares={fixedAnalysis.breakdown} categories={categoryById} total={fixedAnalysis.total} />
            <AppText variant="caption" color="textSecondary">
              {describeComparison(fixedAnalysis.totalComparison)}
            </AppText>
          </Card>
        </>
      ) : null}
    </>
  );
}

function VariableTab({ data, today }: { data: ExpensesData; today: string }) {
  const { spacing } = useTheme();
  const { variableAnalysis, variableTransactions, categoryById, accounts } = data;
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const { impact, topCategories } = variableAnalysis;
  const biggestRise = variableAnalysis.categoryChanges.find((change) => change.trend === 'up' && change.percentage !== null);

  if (variableTransactions.length === 0) {
    return (
      <EmptyState
        icon="coffee"
        title="Sin gastos variables este mes"
        description="Registra tus cafés, delivery, supermercado o salidas en dos toques con el botón “Registrar gasto”."
        action={{ label: 'Registrar gasto', onPress: () => router.push('/gasto-rapido') }}
      />
    );
  }

  return (
    <>
      <Card style={{ gap: spacing.sm }}>
        <AppText variant="caption" color="textSecondary">
          Gastos variables del mes
        </AppText>
        <AppText variant="amount">{formatCLP(impact.total)}</AppText>
        <AppText variant="caption" color="textSecondary">
          {impact.percentageOfIncome === null ? 'Sin ingreso registrado' : `${formatPercent(impact.percentageOfIncome)} de tu ingreso`} · A este ritmo,{' '}
          <AppText variant="caption" color="text">
            {formatCLP(impact.projectedAnnual)} al año
          </AppText>
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {describeComparison(variableAnalysis.totalComparison)}
        </AppText>
      </Card>

      {topCategories.length > 0 ? (
        <>
          <SectionHeader title="Top 3 del mes" />
          <Card style={{ gap: spacing.md }}>
            {topCategories.map((top, index) => {
              const category = categoryById.get(top.categoryId);
              return (
                <View key={top.categoryId} style={{ gap: spacing.xs }}>
                  {index > 0 ? <Divider /> : null}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText variant="bodyStrong">
                      {index + 1}. {category?.name ?? 'Categoría eliminada'}
                    </AppText>
                    <AppText variant="bodyStrong">{formatCLP(top.total)}</AppText>
                  </View>
                  <AppText variant="caption" color="textSecondary">
                    Tu {category?.name.toLowerCase() ?? 'gasto'} a este ritmo = {formatCLP(top.projectedAnnual)} al año
                  </AppText>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      <SectionHeader title="Por categoría" />
      <Card style={{ gap: spacing.md }}>
        <CategoryDonut shares={variableAnalysis.breakdown} categories={categoryById} total={variableAnalysis.total} />
        {biggestRise ? (
          <AppText variant="caption" color="textSecondary">
            Mayor alza: {categoryById.get(biggestRise.categoryId)?.name ?? 'otra categoría'}, {formatPercent(biggestRise.percentage ?? 0)} más que el mes anterior.
          </AppText>
        ) : null}
      </Card>

      <SectionHeader title="Últimos gastos" action={{ label: 'Ver historial', onPress: () => router.push('/historial') }} />
      <Card style={{ paddingVertical: spacing.sm }}>
        {variableTransactions.slice(0, RECENT_VARIABLE).map((transaction, index) => (
          <View key={transaction.id}>
            {index > 0 ? <Divider /> : null}
            <MovementRow
              transaction={transaction}
              category={transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined}
              account={transaction.accountId ? accountById.get(transaction.accountId) : undefined}
              onPress={() => router.push({ pathname: '/movimiento/[id]', params: { id: transaction.id } })}
            />
          </View>
        ))}
      </Card>
      <AppText variant="caption" color="textSecondary" align="center">
        Mes financiero hasta el {formatShortDate(data.summary.period.end)} · hoy {formatShortDate(today)}
      </AppText>
    </>
  );
}
