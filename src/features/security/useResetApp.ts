import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteAllProfilePhotos } from '@/services/files/profilePhoto';
import { useRepositories } from '@/services/RepositoriesProvider';
import { pinService } from '@/services/security';
import { useSessionStore } from '@/store/sessionStore';
import { useUiStore } from '@/store/uiStore';

/**
 * Borra TODOS los datos (base, PIN, fotos), vuelve a crear las categorías por
 * defecto y lleva a la persona al onboarding.
 */
export function useResetApp() {
  const { data } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await data.wipeAll();
      await pinService.clear();
      deleteAllProfilePhotos();
      await data.seedDefaults();
    },
    onSuccess: () => {
      queryClient.clear();
      useUiStore.getState().setThemePreference('system');
      useSessionStore.getState().reset();
    },
  });
}
