import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useCategories } from '@/features/categories/queries';
import { computeMonthlyNetIncome } from '@/features/profile/netSalary';
import { useTransactions } from '@/features/wallet/queries';
import { useWalletSummary } from '@/features/wallet/useWalletSummary';
import { EXPENSE_TYPES, getPreviousPeriod, sumByCategory } from '@/lib/finance';
import { useRepositories } from '@/services/RepositoriesProvider';

import { buildBudgetRows, calcBudgetTotals, compareWith503020 } from './budgetModel';

const BUDGETS_KEY = ['budgets'] as const;

export function useBudgets() {
  const { budgets } = useRepositories();
  return useQuery({ queryKey: BUDGETS_KEY, queryFn: () => budgets.list() });
}

/** Presupuestos del período con lo gastado, la comparación 50/30/20 y el gasto del mes anterior. */
export function useBudgetsData() {
  const wallet = useWalletSummary();
  const budgets = useBudgets();
  const categories = useCategories();
  const summary = wallet.data?.summary;
  const payDay = wallet.data?.profile.payDay ?? 1;
  const mode = wallet.data?.settings.periodMode ?? 'calendar';
  const previousPeriod = useMemo(() => (summary ? getPreviousPeriod(summary.period, payDay, mode) : null), [summary, payDay, mode]);
  const previous = useTransactions(previousPeriod ? { from: previousPeriod.start, to: previousPeriod.end, types: EXPENSE_TYPES } : { types: [] });

  const queries = [budgets, categories, previous];
  const isPending = wallet.isPending || queries.some((query) => query.isPending);
  const isError = wallet.isError || queries.some((query) => query.isError);
  const refetch = () => Promise.all([wallet.refetch(), ...queries.map((query) => query.refetch())]);

  const data = useMemo(() => {
    if (!wallet.data || !budgets.data || !categories.data || !previous.data) return null;
    const periodExpenses = wallet.data.summary.periodTransactions.filter((tx) => EXPENSE_TYPES.includes(tx.type));
    const netIncome = computeMonthlyNetIncome(wallet.data.profile, wallet.data.settings);
    const rows = buildBudgetRows(budgets.data, categories.data, periodExpenses);
    return {
      rows,
      totals: calcBudgetTotals(rows),
      groups: compareWith503020(netIncome, categories.data, periodExpenses),
      netIncome,
      categories: categories.data,
      previousSpentByCategory: sumByCategory(previous.data),
      spentByCategory: sumByCategory(periodExpenses),
    };
  }, [wallet.data, budgets.data, categories.data, previous.data]);

  return { data, isPending, isError, refetch };
}

function useInvalidateBudgets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: BUDGETS_KEY });
}

export function useUpsertBudget() {
  const { budgets } = useRepositories();
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: ({ categoryId, monthlyLimit }: { categoryId: string; monthlyLimit: number }) => budgets.upsert(categoryId, monthlyLimit),
    onSuccess: invalidate,
  });
}

export function useUpsertManyBudgets() {
  const { budgets } = useRepositories();
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: (limits: readonly { categoryId: string; monthlyLimit: number }[]) => budgets.upsertMany(limits),
    onSuccess: invalidate,
  });
}

export function useDeleteBudget() {
  const { budgets } = useRepositories();
  const invalidate = useInvalidateBudgets();
  return useMutation({ mutationFn: (id: string) => budgets.remove(id), onSuccess: invalidate });
}
