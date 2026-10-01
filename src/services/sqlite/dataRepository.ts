import { count } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import { ALL_TABLES, accounts, categories } from '@/db/schema';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '@/db/seed';
import type { AppDatabase } from '@/db/types';

import { BACKUP_TABLES, type BackupData } from '../backup/backupFormat';
import { newRowFields, type RepositoryContext } from '../context';
import type { DataRepository } from '../types';

/** Filas por INSERT (bajo el límite de variables de SQLite). */
const INSERT_CHUNK = 100;

type SyncTransaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];

function insertRows<T extends SQLiteTable>(tx: SyncTransaction, table: T, rows: readonly T['$inferInsert'][]) {
  for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
    tx.insert(table)
      .values(rows.slice(start, start + INSERT_CHUNK) as T['$inferInsert'][])
      .run();
  }
}

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

    async exportAll() {
      // Incluye filas eliminadas (borrado lógico) para que el respaldo sea fiel.
      return {
        profile: db.select().from(BACKUP_TABLES.profile).all(),
        settings: db.select().from(BACKUP_TABLES.settings).all(),
        accounts: db.select().from(BACKUP_TABLES.accounts).all(),
        categories: db.select().from(BACKUP_TABLES.categories).all(),
        fixedExpenses: db.select().from(BACKUP_TABLES.fixedExpenses).all(),
        debts: db.select().from(BACKUP_TABLES.debts).all(),
        transactions: db.select().from(BACKUP_TABLES.transactions).all(),
        fixedExpenseOccurrences: db.select().from(BACKUP_TABLES.fixedExpenseOccurrences).all(),
        debtPayments: db.select().from(BACKUP_TABLES.debtPayments).all(),
        budgets: db.select().from(BACKUP_TABLES.budgets).all(),
        savingsGoals: db.select().from(BACKUP_TABLES.savingsGoals).all(),
      };
    },

    async replaceAll(data: BackupData) {
      // Todo o nada: si algo falla, los datos actuales quedan intactos.
      db.transaction((tx) => {
        for (const table of [...ALL_TABLES].reverse()) tx.delete(table).run();
        insertRows(tx, BACKUP_TABLES.profile, data.profile);
        insertRows(tx, BACKUP_TABLES.settings, data.settings);
        insertRows(tx, BACKUP_TABLES.accounts, data.accounts);
        insertRows(tx, BACKUP_TABLES.categories, data.categories);
        insertRows(tx, BACKUP_TABLES.fixedExpenses, data.fixedExpenses);
        insertRows(tx, BACKUP_TABLES.debts, data.debts);
        insertRows(tx, BACKUP_TABLES.transactions, data.transactions);
        insertRows(tx, BACKUP_TABLES.fixedExpenseOccurrences, data.fixedExpenseOccurrences);
        insertRows(tx, BACKUP_TABLES.debtPayments, data.debtPayments);
        insertRows(tx, BACKUP_TABLES.budgets, data.budgets);
        insertRows(tx, BACKUP_TABLES.savingsGoals, data.savingsGoals);
      });
    },
  };
}
