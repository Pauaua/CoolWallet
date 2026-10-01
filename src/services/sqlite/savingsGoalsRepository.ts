import { and, asc, eq, isNull } from 'drizzle-orm';

import { savingsGoals } from '@/db/schema';

import { NotFoundError, newRowFields, type RepositoryContext } from '../context';
import type { SavingsGoalsRepository } from '../types';

export function createSavingsGoalsRepository(ctx: RepositoryContext): SavingsGoalsRepository {
  const { db } = ctx;
  const active = (id: string) => and(eq(savingsGoals.id, id), isNull(savingsGoals.deletedAt));

  return {
    async list() {
      return db.select().from(savingsGoals).where(isNull(savingsGoals.deletedAt)).orderBy(asc(savingsGoals.targetDate), asc(savingsGoals.name)).all();
    },

    async getById(id) {
      return db.select().from(savingsGoals).where(active(id)).get() ?? null;
    },

    async create(input) {
      return db
        .insert(savingsGoals)
        .values({ ...input, ...newRowFields(ctx) })
        .returning()
        .get();
    },

    async update(id, patch) {
      const updated = db
        .update(savingsGoals)
        .set({ ...patch, updatedAt: ctx.now() })
        .where(active(id))
        .returning()
        .get();
      if (!updated) throw new NotFoundError('Meta', id);
      return updated;
    },

    async addContribution(id, amount) {
      return db.transaction((tx) => {
        const goal = tx.select().from(savingsGoals).where(active(id)).get();
        if (!goal) throw new NotFoundError('Meta', id);
        return tx
          .update(savingsGoals)
          .set({ savedAmount: Math.max(0, goal.savedAmount + amount), updatedAt: ctx.now() })
          .where(eq(savingsGoals.id, id))
          .returning()
          .get();
      });
    },

    async remove(id) {
      const timestamp = ctx.now();
      db.update(savingsGoals).set({ deletedAt: timestamp, updatedAt: timestamp }).where(active(id)).run();
    },
  };
}
