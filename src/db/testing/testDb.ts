import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import * as schema from '../schema';
import type { AppDatabase } from '../types';
import type { RepositoryContext } from '@/services/context';

/** Base de datos en memoria con las mismas migraciones que la app. */
export function createTestDatabase(): AppDatabase {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, '..', 'migrations') });
  return db;
}

/** Contexto de repositorios con reloj controlable. */
export function createTestContext(startAt = '2026-09-30T12:00:00.000Z'): RepositoryContext & { advance: (ms: number) => void } {
  let current = new Date(startAt).getTime();
  return {
    db: createTestDatabase(),
    newId: () => randomUUID(),
    now: () => new Date(current).toISOString(),
    advance: (ms: number) => {
      current += ms;
    },
  };
}
