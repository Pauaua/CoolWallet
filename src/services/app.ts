import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';

import { createSqliteRepositories } from './sqlite';

/** Repositorios de la app (SQLite local). */
export const appRepositories = createSqliteRepositories({
  db,
  newId: () => randomUUID(),
  now: () => new Date().toISOString(),
});
