import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/services/queryClient';
import { useRepositories } from '@/services/RepositoriesProvider';
import type { CategoryKind } from '@/types/enums';
import type { CategoryInput } from '@/types/models';

/** Categorías activas (opcionalmente de ciertos tipos). */
export function useCategories(kinds?: readonly CategoryKind[]) {
  const { categories } = useRepositories();
  return useQuery({
    queryKey: [...queryKeys.categories, kinds ?? 'all'],
    queryFn: () => categories.list(kinds ? { kinds } : undefined),
  });
}

export function useCategory(id: string | undefined) {
  const { categories } = useRepositories();
  return useQuery({
    queryKey: [...queryKeys.categories, 'detail', id],
    queryFn: () => (id ? categories.getById(id) : null),
    enabled: Boolean(id),
  });
}

export function useSaveCategory() {
  const { categories } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CategoryInput }) => (id ? categories.update(id, input) : categories.create(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  });
}

export function useDeleteCategory() {
  const { categories } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categories.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  });
}
