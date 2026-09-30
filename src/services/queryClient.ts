import { QueryClient } from '@tanstack/react-query';

/** Claves de TanStack Query. Invalidar la clave de una entidad refresca todas sus consultas. */
export const queryKeys = {
  profile: ['profile'] as const,
  settings: ['settings'] as const,
  accounts: ['accounts'] as const,
  categories: ['categories'] as const,
};

/**
 * Los datos son locales: sin reintentos ni pausas "offline", y solo se
 * refrescan cuando una mutación invalida su clave.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { networkMode: 'always', retry: false, staleTime: Infinity, gcTime: 30 * 60_000 },
      mutations: { networkMode: 'always', retry: false },
    },
  });
}
