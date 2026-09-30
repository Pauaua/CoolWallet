import { and, asc, eq, isNull } from 'drizzle-orm';

import { accounts } from '@/db/schema';

import { NotFoundError, newRowFields, type RepositoryContext } from '../context';
import type { AccountsRepository } from '../types';

export function createAccountsRepository(ctx: RepositoryContext): AccountsRepository {
  const { db } = ctx;
  const active = (id: string) => and(eq(accounts.id, id), isNull(accounts.deletedAt));

  return {
    async list() {
      return db.select().from(accounts).where(isNull(accounts.deletedAt)).orderBy(asc(accounts.sortOrder), asc(accounts.name)).all();
    },

    async getById(id) {
      return db.select().from(accounts).where(active(id)).get() ?? null;
    },

    async create(input) {
      return db
        .insert(accounts)
        .values({ ...input, ...newRowFields(ctx) })
        .returning()
        .get();
    },

    async update(id, patch) {
      const updated = db
        .update(accounts)
        .set({ ...patch, updatedAt: ctx.now() })
        .where(active(id))
        .returning()
        .get();
      if (!updated) throw new NotFoundError('Cuenta', id);
      return updated;
    },

    async remove(id) {
      const timestamp = ctx.now();
      db.update(accounts).set({ deletedAt: timestamp, updatedAt: timestamp }).where(active(id)).run();
    },
  };
}
