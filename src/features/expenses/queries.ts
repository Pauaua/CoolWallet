import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { generateRecurringExpenses, type FinancialPeriod } from '@/lib/finance';
import { queryKeys } from '@/services/queryClient';
import { useRepositories } from '@/services/RepositoriesProvider';
import type { PayOccurrenceInput } from '@/services/types';
import type { FixedExpenseInput } from '@/types/models';

const FIXED_KEY = ['fixedExpenses'] as const;
const OCCURRENCES_KEY = ['occurrences'] as const;

export function useFixedExpenses() {
  const { fixedExpenses } = useRepositories();
  return useQuery({ queryKey: FIXED_KEY, queryFn: () => fixedExpenses.list() });
}

export function useFixedExpense(id: string | undefined) {
  const { fixedExpenses } = useRepositories();
  return useQuery({ queryKey: [...FIXED_KEY, 'detail', id], queryFn: () => (id ? fixedExpenses.getById(id) : null), enabled: Boolean(id) });
}

/**
 * Vencimientos de gastos fijos del período. Antes de leerlos, los sincroniza
 * con los gastos fijos vigentes (la generación es idempotente).
 */
export function usePeriodOccurrences(period: FinancialPeriod | null) {
  const { fixedExpenses } = useRepositories();
  return useQuery({
    queryKey: [...OCCURRENCES_KEY, period?.start, period?.end],
    enabled: period !== null,
    queryFn: async () => {
      if (!period) return [];
      const range = { from: period.start, to: period.end };
      const definitions = await fixedExpenses.list();
      await fixedExpenses.syncOccurrences(range, generateRecurringExpenses(definitions, period));
      return fixedExpenses.listOccurrences(range);
    },
  });
}

/** Vencimientos ya generados en un rango (sin sincronizar): para saber cuáles están pagados. */
export function useOccurrencesInRange(range: { from: string; to: string }) {
  const { fixedExpenses } = useRepositories();
  return useQuery({ queryKey: [...OCCURRENCES_KEY, 'range', range.from, range.to], queryFn: () => fixedExpenses.listOccurrences(range) });
}

/** Refresca gastos fijos, vencimientos, movimientos y saldos. */
function useInvalidateExpenses() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [FIXED_KEY, OCCURRENCES_KEY, ['transactions'], queryKeys.accounts].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}

export function useSaveFixedExpense() {
  const { fixedExpenses } = useRepositories();
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: FixedExpenseInput }) => (id ? fixedExpenses.update(id, input) : fixedExpenses.create(input)),
    onSuccess: invalidate,
  });
}

export function useDeleteFixedExpense() {
  const { fixedExpenses } = useRepositories();
  const invalidate = useInvalidateExpenses();
  return useMutation({ mutationFn: (id: string) => fixedExpenses.remove(id), onSuccess: invalidate });
}

export function useMarkOccurrencePaid() {
  const { fixedExpenses } = useRepositories();
  const invalidate = useInvalidateExpenses();
  return useMutation({
    mutationFn: ({ occurrenceId, payment }: { occurrenceId: string; payment: PayOccurrenceInput }) => fixedExpenses.markPaid(occurrenceId, payment),
    onSuccess: invalidate,
  });
}

export function useMarkOccurrencePending() {
  const { fixedExpenses } = useRepositories();
  const invalidate = useInvalidateExpenses();
  return useMutation({ mutationFn: (occurrenceId: string) => fixedExpenses.markPending(occurrenceId), onSuccess: invalidate });
}
