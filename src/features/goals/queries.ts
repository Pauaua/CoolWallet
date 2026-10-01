import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from '@/services/RepositoriesProvider';
import type { SavingsGoalInput } from '@/types/models';

const GOALS_KEY = ['savingsGoals'] as const;

export function useSavingsGoals() {
  const { savingsGoals } = useRepositories();
  return useQuery({ queryKey: GOALS_KEY, queryFn: () => savingsGoals.list() });
}

function useInvalidateGoals() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: GOALS_KEY });
}

export function useSaveGoal() {
  const { savingsGoals } = useRepositories();
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: SavingsGoalInput }) => (id ? savingsGoals.update(id, input) : savingsGoals.create(input)),
    onSuccess: invalidate,
  });
}

export function useDeleteGoal() {
  const { savingsGoals } = useRepositories();
  const invalidate = useInvalidateGoals();
  return useMutation({ mutationFn: (id: string) => savingsGoals.remove(id), onSuccess: invalidate });
}

export function useAddContribution() {
  const { savingsGoals } = useRepositories();
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => savingsGoals.addContribution(id, amount),
    onSuccess: invalidate,
  });
}
