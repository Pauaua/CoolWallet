import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, View } from 'react-native';

import { AppText, ChipGroup, EmptyState, ErrorState, LoadingState } from '@/components';
import { useCategories } from '@/features/categories/queries';
import { useProfile } from '@/features/profile/queries';
import { useSettings } from '@/features/settings/queries';
import {
  buildHistoryFilter,
  HISTORY_RANGE_OPTIONS,
  HISTORY_TYPE_OPTIONS,
  type HistoryRangePreset,
  type HistoryTypeFilter,
} from '@/features/wallet/historyFilters';
import { MovementRow } from '@/features/wallet/MovementRow';
import { useAccounts, useTransactions } from '@/features/wallet/queries';
import { formatRelativeDay } from '@/lib/dates';
import { formatCLP, summarizePeriodFlow, toIsoDate } from '@/lib/finance';
import { useTheme } from '@/theme';
import type { Transaction } from '@/types/models';

const ALL_CATEGORIES = '__all__';

/** Historial de movimientos con filtros por tipo, categoría y rango de fechas. */
export default function HistoryScreen() {
  const { colors, spacing } = useTheme();
  const profile = useProfile();
  const settings = useSettings();
  const accounts = useAccounts();
  const categories = useCategories();
  const [preset, setPreset] = useState<HistoryRangePreset>('period');
  const [type, setType] = useState<HistoryTypeFilter>('all');
  const [categoryId, setCategoryId] = useState<string>(ALL_CATEGORIES);
  const today = toIsoDate(new Date());

  const filter = useMemo(
    () =>
      buildHistoryFilter({
        preset,
        type,
        categoryId: categoryId === ALL_CATEGORIES ? null : categoryId,
        today,
        payDay: profile.data?.payDay ?? 1,
        mode: settings.data?.periodMode ?? 'calendar',
      }),
    [preset, type, categoryId, today, profile.data?.payDay, settings.data?.periodMode],
  );
  const transactions = useTransactions(filter);

  const sections = useMemo(() => groupByDay(transactions.data ?? [], today), [transactions.data, today]);
  const flow = useMemo(() => summarizePeriodFlow(transactions.data ?? []), [transactions.data]);
  const categoryById = new Map((categories.data ?? []).map((category) => [category.id, category]));
  const accountById = new Map((accounts.data ?? []).map((account) => [account.id, account]));

  if (profile.isPending || settings.isPending) return <LoadingState />;
  if (profile.isError || settings.isError) return <ErrorState onRetry={() => void profile.refetch()} />;

  const filters = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <ChipGroup accessibilityLabel="Rango de fechas" options={HISTORY_RANGE_OPTIONS} value={preset} onChange={setPreset} />
      <ChipGroup accessibilityLabel="Tipo de movimiento" options={HISTORY_TYPE_OPTIONS} value={type} onChange={setType} />
      <ChipGroup
        accessibilityLabel="Categoría"
        options={[{ value: ALL_CATEGORIES, label: 'Todas las categorías' }, ...(categories.data ?? []).map((category) => ({ value: category.id, label: category.name }))]}
        value={categoryId}
        onChange={setCategoryId}
      />
      {transactions.data && transactions.data.length > 0 ? (
        <AppText variant="caption" color="textSecondary">
          {transactions.data.length} movimientos · Entradas {formatCLP(flow.income)} · Salidas {formatCLP(flow.expenses + flow.debtPayments)}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <SectionList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
      sections={sections}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={filters}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <AppText variant="label" color="textSecondary" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
          {section.title}
        </AppText>
      )}
      renderItem={({ item }) => (
        <MovementRow
          transaction={item}
          category={item.categoryId ? categoryById.get(item.categoryId) : undefined}
          account={item.accountId ? accountById.get(item.accountId) : undefined}
          onPress={() => router.push({ pathname: '/movimiento/[id]', params: { id: item.id } })}
        />
      )}
      ListEmptyComponent={
        transactions.isPending ? (
          <LoadingState />
        ) : transactions.isError ? (
          <ErrorState onRetry={() => void transactions.refetch()} />
        ) : (
          <EmptyState icon="inbox" title="Sin movimientos" description="No hay movimientos con estos filtros. Prueba con otro rango o tipo." />
        )
      }
    />
  );
}

function groupByDay(transactions: readonly Transaction[], today: string) {
  const sections: { title: string; data: Transaction[] }[] = [];
  let currentDate: string | null = null;
  for (const transaction of transactions) {
    if (transaction.date !== currentDate) {
      currentDate = transaction.date;
      sections.push({ title: formatRelativeDay(transaction.date, today), data: [] });
    }
    sections[sections.length - 1]!.data.push(transaction);
  }
  return sections;
}
