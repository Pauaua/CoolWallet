import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { computeMonthlyNetIncome } from '@/features/profile/netSalary';
import { useProfile } from '@/features/profile/queries';
import { useSettings } from '@/features/settings/queries';
import { toIsoDate } from '@/lib/finance';
import { queryKeys } from '@/services/queryClient';
import { useRepositories } from '@/services/RepositoriesProvider';
import type { DebtPaymentInput } from '@/services/types';
import type { DebtInput } from '@/types/models';

import { buildDebtsSummary } from './debtModel';

const DEBTS_KEY = ['debts'] as const;
const PAYMENTS_KEY = ['debtPayments'] as const;

export function useDebts() {
  const { debts } = useRepositories();
  return useQuery({ queryKey: DEBTS_KEY, queryFn: () => debts.list() });
}

export function useDebtPayments() {
  const { debts } = useRepositories();
  return useQuery({ queryKey: PAYMENTS_KEY, queryFn: () => debts.listPayments() });
}

/** Resumen de deudas con el ingreso líquido del perfil (sueldo líquido + otros ingresos). */
export function useDebtsSummary() {
  const debts = useDebts();
  const payments = useDebtPayments();
  const profile = useProfile();
  const settings = useSettings();
  const today = toIsoDate(new Date());

  const queries = [debts, payments, profile, settings];
  const isPending = queries.some((query) => query.isPending);
  const isError = queries.some((query) => query.isError);
  const refetch = () => Promise.all(queries.map((query) => query.refetch()));

  const data = useMemo(() => {
    if (!debts.data || !payments.data || !profile.data || !settings.data) return null;
    const netIncome = computeMonthlyNetIncome(profile.data, settings.data);
    return { netIncome, ...buildDebtsSummary(debts.data, payments.data, netIncome, today) };
  }, [debts.data, payments.data, profile.data, settings.data, today]);

  return { data, isPending, isError, refetch, today };
}

function useInvalidateDebts() {
  const queryClient = useQueryClient();
  return () => Promise.all([DEBTS_KEY, PAYMENTS_KEY, ['transactions'], queryKeys.accounts].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function useSaveDebt() {
  const { debts } = useRepositories();
  const invalidate = useInvalidateDebts();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: DebtInput }) => (id ? debts.update(id, input) : debts.create(input)),
    onSuccess: invalidate,
  });
}

export function useDeleteDebt() {
  const { debts } = useRepositories();
  const invalidate = useInvalidateDebts();
  return useMutation({ mutationFn: (id: string) => debts.remove(id), onSuccess: invalidate });
}

export function useAddDebtPayment() {
  const { debts } = useRepositories();
  const invalidate = useInvalidateDebts();
  return useMutation({
    mutationFn: ({ debtId, payment }: { debtId: string; payment: DebtPaymentInput }) => debts.addPayment(debtId, payment),
    onSuccess: invalidate,
  });
}

export function useRemoveDebtPayment() {
  const { debts } = useRepositories();
  const invalidate = useInvalidateDebts();
  return useMutation({ mutationFn: (paymentId: string) => debts.removePayment(paymentId), onSuccess: invalidate });
}
