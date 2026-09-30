import { count } from 'drizzle-orm';

import { ALL_TABLES, accounts, categories } from '@/db/schema';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '@/db/seed';

import { newRowFields, type RepositoryContext } from '../context';
import type { DataRepository } from '../types';

export function createDataRepository(ctx: RepositoryContext): DataRepository {
  const { db } = ctx;

  return {
    async seedDefaults() {
      db.transaction((tx) => {
        // Se cuentan también las eliminadas: si la persona borró categorías por defecto, no se recrean.
        const categoryCount = tx.select({ value: count() }).from(categories).get()?.value ?? 0;
        if (categoryCount === 0) {
          tx.insert(categories)
            .values(
              DEFAULT_CATEGORIES.map((category, index) => ({
                ...category,
                isDefault: true,
                sortOrder: index,
                ...newRowFields(ctx),
              })),
            )
            .run();
        }
        const accountCount = tx.select({ value: count() }).from(accounts).get()?.value ?? 0;
        if (accountCount === 0) {
          tx.insert(accounts)
            .values(DEFAULT_ACCOUNTS.map((account) => ({ ...account, ...newRowFields(ctx) })))
            .run();
        }
      });
    },

    async wipeAll() {
      db.transaction((tx) => {
        // Hijos antes que padres por las claves foráneas.
        for (const table of [...ALL_TABLES].reverse()) {
          tx.delete(table).run();
        }
      });
    },
  };
}
