import { useMemo } from 'react';

import { useCategories } from '@/features/categories/queries';
import { useAccounts, useTransactions } from '@/features/wallet/queries';
import { useWalletSummary } from '@/features/wallet/useWalletSummary';
import { getPreviousPeriod } from '@/lib/finance';

import { buildCategoryAnalysis, buildFixedRows, buildVariableAnalysis } from './expensesAnalysis';
import { useFixedExpenses } from './queries';

/** Datos del módulo Gastos (período actual y anterior) con estados combinados. */
export function useExpensesData() {
  const wallet = useWalletSummary();
  const fixedExpenses = useFixedExpenses();
  const categories = useCategories();
  const accounts = useAccounts();

  const summary = wallet.data?.summary;
  const payDay = wallet.data?.profile.payDay ?? 1;
  const mode = wallet.data?.settings.periodMode ?? 'calendar';
  const previousPeriod = useMemo(() => (summary ? getPreviousPeriod(summary.period, payDay, mode) : null), [summary, payDay, mode]);
  const previous = useTransactions(
    previousPeriod ? { from: previousPeriod.start, to: previousPeriod.end, types: ['fixed_expense', 'variable_expense'] } : { types: [] },
  );

  const queries = [fixedExpenses, categories, accounts, previous];
  const isPending = wallet.isPending || queries.some((query) => query.isPending);
  const isError = wallet.isError || queries.some((query) => query.isError);
  const refetch = () => Promise.all([wallet.refetch(), ...queries.map((query) => query.refetch())]);

  const data = useMemo(() => {
    if (!wallet.data || !fixedExpenses.data || !categories.data || !accounts.data || !previous.data) return null;
    const { summary: walletSummary, occurrences, fixedProgress } = wallet.data;
    const current = walletSummary.periodTransactions;
    const byType = (list: typeof current, type: 'fixed_expense' | 'variable_expense') => list.filter((tx) => tx.type === type);
    return {
      summary: walletSummary,
      fixedProgress,
      fixedRows: buildFixedRows(occurrences, fixedExpenses.data, wallet.today),
      fixedExpenses: fixedExpenses.data,
      fixedAnalysis: buildCategoryAnalysis(byType(current, 'fixed_expense'), byType(previous.data, 'fixed_expense')),
      variableTransactions: byType(current, 'variable_expense'),
      variableAnalysis: buildVariableAnalysis({
        current: byType(current, 'variable_expense'),
        previous: byType(previous.data, 'variable_expense'),
        incomeBase: walletSummary.incomeBase,
        daysElapsed: walletSummary.daysElapsed,
        daysInPeriod: walletSummary.period.daysInPeriod,
      }),
      categoryById: new Map(categories.data.map((category) => [category.id, category])),
      accounts: accounts.data,
    };
  }, [wallet.data, wallet.today, fixedExpenses.data, categories.data, accounts.data, previous.data]);

  return { data, isPending, isError, refetch, today: wallet.today };
}
