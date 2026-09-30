import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/services/queryClient';
import { useRepositories } from '@/services/RepositoriesProvider';
import type { TransactionFilter } from '@/services/types';
import type { AccountInput, TransactionInput } from '@/types/models';

const TRANSACTIONS_KEY = ['transactions'] as const;

export function useAccounts() {
  const { accounts } = useRepositories();
  return useQuery({ queryKey: queryKeys.accounts, queryFn: () => accounts.list() });
}

export function useAccount(id: string | undefined) {
  const { accounts } = useRepositories();
  return useQuery({
    queryKey: [...queryKeys.accounts, 'detail', id],
    queryFn: () => (id ? accounts.getById(id) : null),
    enabled: Boolean(id),
  });
}

/** Movimientos filtrados. Sin filtro = todos (se usan para calcular saldos). */
export function useTransactions(filter: TransactionFilter = {}) {
  const { transactions } = useRepositories();
  return useQuery({ queryKey: [...TRANSACTIONS_KEY, filter], queryFn: () => transactions.list(filter) });
}

export function useTransaction(id: string | undefined) {
  const { transactions } = useRepositories();
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, 'detail', id],
    queryFn: () => (id ? transactions.getById(id) : null),
    enabled: Boolean(id),
  });
}

/** Refresca todo lo que depende de movimientos y cuentas. */
function useInvalidateWallet() {
  const queryClient = useQueryClient();
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY }), queryClient.invalidateQueries({ queryKey: queryKeys.accounts })]);
}

export function useCreateTransaction() {
  const { transactions } = useRepositories();
  const invalidate = useInvalidateWallet();
  return useMutation({ mutationFn: (input: TransactionInput) => transactions.create(input), onSuccess: invalidate });
}

export function useUpdateTransaction() {
  const { transactions } = useRepositories();
  const invalidate = useInvalidateWallet();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TransactionInput> }) => transactions.update(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const { transactions } = useRepositories();
  const invalidate = useInvalidateWallet();
  return useMutation({ mutationFn: (id: string) => transactions.remove(id), onSuccess: invalidate });
}

export function useSaveAccount() {
  const { accounts } = useRepositories();
  const invalidate = useInvalidateWallet();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: AccountInput }) => (id ? accounts.update(id, input) : accounts.create(input)),
    onSuccess: invalidate,
  });
}

export function useDeleteAccount() {
  const { accounts } = useRepositories();
  const invalidate = useInvalidateWallet();
  return useMutation({ mutationFn: (id: string) => accounts.remove(id), onSuccess: invalidate });
}
