import { and, eq, isNull } from 'drizzle-orm';

import { budgets } from '@/db/schema';
import type { AppDatabase } from '@/db/types';

import { newRowFields, type RepositoryContext } from '../context';
import type { BudgetsRepository } from '../types';

type SyncTransaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];

export function createBudgetsRepository(ctx: RepositoryContext): BudgetsRepository {
  const { db } = ctx;

  const upsertIn = (tx: SyncTransaction, categoryId: string, monthlyLimit: number) => {
    const existing = tx
      .select()
      .from(budgets)
      .where(and(eq(budgets.categoryId, categoryId), isNull(budgets.deletedAt)))
      .get();
    if (existing) {
      return tx.update(budgets).set({ monthlyLimit, updatedAt: ctx.now() }).where(eq(budgets.id, existing.id)).returning().get();
    }
    return tx
      .insert(budgets)
      .values({ categoryId, monthlyLimit, ...newRowFields(ctx) })
      .returning()
      .get();
  };

  return {
    async list() {
      return db.select().from(budgets).where(isNull(budgets.deletedAt)).all();
    },

    async upsert(categoryId, monthlyLimit) {
      return db.transaction((tx) => upsertIn(tx, categoryId, monthlyLimit));
    },

    async upsertMany(limits) {
      db.transaction((tx) => {
        for (const { categoryId, monthlyLimit } of limits) upsertIn(tx, categoryId, monthlyLimit);
      });
    },

    async remove(id) {
      const timestamp = ctx.now();
      db.update(budgets)
        .set({ deletedAt: timestamp, updatedAt: timestamp })
        .where(and(eq(budgets.id, id), isNull(budgets.deletedAt)))
        .run();
    },
  };
}
