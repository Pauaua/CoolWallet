import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteProfilePhoto } from '@/services/files/profilePhoto';
import { queryKeys } from '@/services/queryClient';
import { useRepositories } from '@/services/RepositoriesProvider';
import type { ProfileInput } from '@/types/models';

export function useProfile() {
  const { profile } = useRepositories();
  return useQuery({ queryKey: queryKeys.profile, queryFn: () => profile.get() });
}

/** Guarda el perfil. Si cambió la foto, borra la anterior del disco. */
export function useSaveProfile() {
  const { profile } = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfileInput) => {
      const previous = await profile.get();
      const saved = await profile.save(input);
      if (previous?.photoUri && previous.photoUri !== saved.photoUri) deleteProfilePhoto(previous.photoUri);
      return saved;
    },
    onSuccess: (saved) => queryClient.setQueryData(queryKeys.profile, saved),
  });
}
