import { useQueryClient } from '@tanstack/react-query';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useCallback, useEffect, useState } from 'react';

import { expoDatabase } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { queryKeys } from '@/services/queryClient';
import { useRepositories } from '@/services/RepositoriesProvider';
import { pinService } from '@/services/security';
import { useSessionStore } from '@/store/sessionStore';
import { useUiStore } from '@/store/uiStore';

export type BootstrapState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready' };

/**
 * Arranque de la app: migraciones → categorías por defecto → carga de perfil,
 * configuración y PIN para decidir entre onboarding y bloqueo.
 */
export function useAppBootstrap(): BootstrapState {
  const migration = useMigrations(expoDatabase, migrations);
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const [state, setState] = useState<BootstrapState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!migration.success) return;
    let cancelled = false;

    (async () => {
      await repositories.data.seedDefaults();
      const [profile, settings, hasPin] = await Promise.all([
        repositories.profile.get(),
        repositories.settings.get(),
        pinService.hasPin(),
      ]);
      if (cancelled) return;
      queryClient.setQueryData(queryKeys.profile, profile);
      queryClient.setQueryData(queryKeys.settings, settings);
      useUiStore.getState().setThemePreference(settings.theme);
      const isOnboarded = Boolean(profile && hasPin && settings.onboardingCompletedAt);
      useSessionStore.setState({ isOnboarded, isLocked: isOnboarded });
      setState({ status: 'ready' });
    })().catch((error: unknown) => {
      if (!cancelled) setState({ status: 'error', message: error instanceof Error ? error.message : String(error), retry });
    });

    return () => {
      cancelled = true;
    };
  }, [migration.success, repositories, queryClient, retry, attempt]);

  if (migration.error) return { status: 'error', message: migration.error.message, retry };
  return state;
}
