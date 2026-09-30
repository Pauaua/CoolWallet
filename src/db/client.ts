import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';
import type { AppDatabase } from './types';

export const DATABASE_NAME = 'controlgastos.db';

const expoDb = openDatabaseSync(DATABASE_NAME);
expoDb.execSync('PRAGMA foreign_keys = ON;');

/** Cliente Drizzle de la app. Solo lo usan `src/services/` y el arranque (migraciones). */
export const expoDatabase = drizzle(expoDb, { schema });
export const db: AppDatabase = expoDatabase;
