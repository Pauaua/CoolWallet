import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/services/queryClient';
import { useRepositories } from '@/services/RepositoriesProvider';
import type { CategoryKind } from '@/types/enums';

/** Categorías activas (opcionalmente de ciertos tipos). */
export function useCategories(kinds?: readonly CategoryKind[]) {
  const { categories } = useRepositories();
  return useQuery({
    queryKey: [...queryKeys.categories, kinds ?? 'all'],
    queryFn: () => categories.list(kinds ? { kinds } : undefined),
  });
}
