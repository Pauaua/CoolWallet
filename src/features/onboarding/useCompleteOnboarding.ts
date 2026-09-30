import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toProfileInput } from '@/features/profile/profileSchema';
import { queryKeys } from '@/services/queryClient';
import { useRepositories } from '@/services/RepositoriesProvider';
import { useSessionStore } from '@/store/sessionStore';

import { useOnboardingStore } from './onboardingStore';

/** Guarda perfil y configuración del onboarding y entra a la app. El PIN ya se guardó en su paso. */
export function useCompleteOnboarding() {
  const { profile, settings } = useRepositories();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ biometricsEnabled }: { biometricsEnabled: boolean }) => {
      const { name, salary } = useOnboardingStore.getState();
      if (!salary) throw new Error('Faltan los datos de sueldo.');
      const savedProfile = await profile.save(toProfileInput(name, salary, null));
      const savedSettings = await settings.update({ biometricsEnabled, onboardingCompletedAt: new Date().toISOString() });
      return { savedProfile, savedSettings };
    },
    onSuccess: ({ savedProfile, savedSettings }) => {
      queryClient.setQueryData(queryKeys.profile, savedProfile);
      queryClient.setQueryData(queryKeys.settings, savedSettings);
      useOnboardingStore.getState().clear();
      useSessionStore.getState().completeOnboarding();
    },
  });
}
