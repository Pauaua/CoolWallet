import { createContext, useContext, type ReactNode } from 'react';

import type { Repositories } from './types';

const RepositoriesContext = createContext<Repositories | null>(null);

export function RepositoriesProvider({ repositories, children }: { repositories: Repositories; children: ReactNode }) {
  return <RepositoriesContext.Provider value={repositories}>{children}</RepositoriesContext.Provider>;
}

/** Acceso a los repositorios. Solo lo usan los hooks de `src/features/`, no las pantallas. */
export function useRepositories(): Repositories {
  const repositories = useContext(RepositoriesContext);
  if (!repositories) throw new Error('useRepositories debe usarse dentro de RepositoriesProvider');
  return repositories;
}
