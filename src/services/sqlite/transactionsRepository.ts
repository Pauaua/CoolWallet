import { and, desc, eq, gte, inArray, isNull, lte, type SQL } from 'drizzle-orm';

import { transactions } from '@/db/schema';

import { NotFoundError, newRowFields, type RepositoryContext } from '../context';
import type { TransactionFilter, TransactionsRepository } from '../types';

function buildConditions(filter: TransactionFilter): SQL[] {
  const conditions: SQL[] = [isNull(transactions.deletedAt)];
  if (filter.from) conditions.push(gte(transactions.date, filter.from));
  if (filter.to) conditions.push(lte(transactions.date, filter.to));
  if (filter.types) conditions.push(inArray(transactions.type, [...filter.types]));
  if (filter.categoryIds) conditions.push(inArray(transactions.categoryId, [...filter.categoryIds]));
  if (filter.accountId) conditions.push(eq(transactions.accountId, filter.accountId));
  if (filter.onlySalary) conditions.push(eq(transactions.isSalary, true));
  return conditions;
}

export function createTransactionsRepository(ctx: RepositoryContext): TransactionsRepository {
  const { db } = ctx;
  const active = (id: string) => and(eq(transactions.id, id), isNull(transactions.deletedAt));

  return {
    async list(filter = {}) {
      return db
        .select()
        .from(transactions)
        .where(and(...buildConditions(filter)))
        .orderBy(desc(transactions.date), desc(transactions.createdAt))
        .all();
    },

    async getById(id) {
      return db.select().from(transactions).where(active(id)).get() ?? null;
    },

    async create(input) {
      return db
        .insert(transactions)
        .values({ ...input, ...newRowFields(ctx) })
        .returning()
        .get();
    },

    async update(id, patch) {
      const updated = db
        .update(transactions)
        .set({ ...patch, updatedAt: ctx.now() })
        .where(active(id))
        .returning()
        .get();
      if (!updated) throw new NotFoundError('Movimiento', id);
      return updated;
    },

    async remove(id) {
      const timestamp = ctx.now();
      db.update(transactions).set({ deletedAt: timestamp, updatedAt: timestamp }).where(active(id)).run();
    },
  };
}
