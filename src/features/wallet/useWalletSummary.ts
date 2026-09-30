import { useMemo } from 'react';

import { useProfile } from '@/features/profile/queries';
import { computeNetSalary } from '@/features/profile/netSalary';
import { useSettings } from '@/features/settings/queries';
import { toIsoDate } from '@/lib/finance';

import { useAccounts, useTransactions } from './queries';
import { buildWalletSummary } from './walletSummary';

/** Resumen de la Billetera y del sueldo, con estados de carga y error combinados. */
export function useWalletSummary() {
  const profile = useProfile();
  const settings = useSettings();
  const accounts = useAccounts();
  const transactions = useTransactions();
  const today = toIsoDate(new Date());

  const queries = [profile, settings, accounts, transactions];
  const isPending = queries.some((query) => query.isPending);
  const isError = queries.some((query) => query.isError);
  const refetch = () => Promise.all(queries.map((query) => query.refetch()));

  const data = useMemo(() => {
    if (!profile.data || !settings.data || !accounts.data || !transactions.data) return null;
    const netSalary = computeNetSalary(profile.data, settings.data);
    return {
      profile: profile.data,
      settings: settings.data,
      netSalary,
      summary: buildWalletSummary({
        accounts: accounts.data,
        transactions: transactions.data,
        payDay: profile.data.payDay,
        periodMode: settings.data.periodMode,
        expectedSalary: netSalary.net,
        today,
      }),
    };
  }, [profile.data, settings.data, accounts.data, transactions.data, today]);

  return { data, isPending, isError, refetch, today };
}
