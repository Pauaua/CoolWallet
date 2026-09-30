import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import { categories } from '@/db/schema';

import { NotFoundError, newRowFields, type RepositoryContext } from '../context';
import type { CategoriesRepository } from '../types';

export function createCategoriesRepository(ctx: RepositoryContext): CategoriesRepository {
  const { db } = ctx;
  const active = (id: string) => and(eq(categories.id, id), isNull(categories.deletedAt));

  return {
    async list(filter = {}) {
      const conditions = [isNull(categories.deletedAt)];
      if (filter.kinds) conditions.push(inArray(categories.kind, [...filter.kinds]));
      return db
        .select()
        .from(categories)
        .where(and(...conditions))
        .orderBy(asc(categories.sortOrder), asc(categories.name))
        .all();
    },

    async getById(id) {
      return db.select().from(categories).where(active(id)).get() ?? null;
    },

    async create(input) {
      return db
        .insert(categories)
        .values({ ...input, ...newRowFields(ctx) })
        .returning()
        .get();
    },

    async update(id, patch) {
      const updated = db
        .update(categories)
        .set({ ...patch, updatedAt: ctx.now() })
        .where(active(id))
        .returning()
        .get();
      if (!updated) throw new NotFoundError('Categoría', id);
      return updated;
    },

    async remove(id) {
      const timestamp = ctx.now();
      db.update(categories).set({ deletedAt: timestamp, updatedAt: timestamp }).where(active(id)).run();
    },
  };
}
