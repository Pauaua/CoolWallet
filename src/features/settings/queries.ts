import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/services/queryClient';
import { useRepositories } from '@/services/RepositoriesProvider';
import { useUiStore } from '@/store/uiStore';
import type { SettingsPatch } from '@/types/models';

export function useSettings() {
  const { settings } = useRepositories();
  return useQuery({ queryKey: queryKeys.settings, queryFn: () => settings.get() });
}

/** Actualiza la configuración y sincroniza el estado de UI que depende de ella (tema). */
export function useUpdateSettings() {
  const { settings } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) => settings.update(patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.settings, updated);
      useUiStore.getState().setThemePreference(updated.theme);
    },
  });
}
