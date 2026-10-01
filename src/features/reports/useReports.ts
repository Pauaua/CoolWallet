import { useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useCategories } from '@/features/categories/queries';
import { useDebtPayments, useDebts } from '@/features/debts/queries';
import { useProfile } from '@/features/profile/queries';
import { useSettings } from '@/features/settings/queries';
import { useAccounts, useTransactions } from '@/features/wallet/queries';
import { EXPENSE_TYPES, filterByPeriod, toIsoDate, type FinancialPeriod } from '@/lib/finance';
import { shareTextFile } from '@/services/files/shareFiles';
import type { Account, Category, Transaction } from '@/types/models';

import { csvFileName, toTransactionsCsv } from './csv';
import { generateInsights } from './insights';
import { buildMonthlyReports } from './reportsModel';

/** Reportes de los últimos 6 meses e insights. */
export function useReports() {
  const transactions = useTransactions();
  const debts = useDebts();
  const payments = useDebtPayments();
  const profile = useProfile();
  const settings = useSettings();
  const categories = useCategories();
  const accounts = useAccounts();
  const today = toIsoDate(new Date());

  const queries = [transactions, debts, payments, profile, settings, categories, accounts];
  const isPending = queries.some((query) => query.isPending);
  const isError = queries.some((query) => query.isError);
  const refetch = () => Promise.all(queries.map((query) => query.refetch()));

  const data = useMemo(() => {
    if (!transactions.data || !debts.data || !payments.data || !profile.data || !settings.data || !categories.data || !accounts.data) return null;
    const reports = buildMonthlyReports({
      transactions: transactions.data,
      debts: debts.data,
      payments: payments.data,
      payDay: profile.data.payDay,
      mode: settings.data.periodMode,
      today,
    });
    const current = reports[reports.length - 1];
    const previous = reports[reports.length - 2];
    const expensesIn = (period: FinancialPeriod | undefined) => (period ? filterByPeriod(transactions.data, period).filter((tx) => EXPENSE_TYPES.includes(tx.type)) : []);
    return {
      reports,
      insights: current
        ? generateInsights({ current, previous, currentExpenses: expensesIn(current.period), previousExpenses: expensesIn(previous?.period), categories: categories.data })
        : [],
      transactions: transactions.data,
      categories: categories.data,
      accounts: accounts.data,
    };
  }, [transactions.data, debts.data, payments.data, profile.data, settings.data, categories.data, accounts.data, today]);

  return { data, isPending, isError, refetch };
}

/** Exporta movimientos a CSV y abre la hoja de compartir. */
export function useExportCsv() {
  return useMutation({
    mutationFn: async (input: { transactions: readonly Transaction[]; categories: readonly Category[]; accounts: readonly Account[] }) => {
      if (input.transactions.length === 0) throw new Error('No hay movimientos en ese rango.');
      await shareTextFile({
        fileName: csvFileName(new Date().toISOString()),
        content: toTransactionsCsv(input.transactions, input.categories, input.accounts),
        mimeType: 'text/csv',
        uti: 'public.comma-separated-values-text',
        dialogTitle: 'Exportar movimientos',
      });
    },
  });
}
