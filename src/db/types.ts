import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

/**
 * Base de datos Drizzle síncrona con el esquema de la app. La implementan
 * tanto expo-sqlite (app) como better-sqlite3 (tests).
 */
export type AppDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
