import { eq, isNull } from 'drizzle-orm';

import { settings } from '@/db/schema';
import type { Settings } from '@/types/models';

import { newRowFields, type RepositoryContext } from '../context';
import type { SettingsRepository } from '../types';

export function createSettingsRepository(ctx: RepositoryContext): SettingsRepository {
  const { db } = ctx;

  /** Devuelve la fila de configuración, creándola con los valores por defecto si falta. */
  const ensure = (): Settings => {
    const existing = db.select().from(settings).where(isNull(settings.deletedAt)).limit(1).get();
    if (existing) return existing;
    return db.insert(settings).values(newRowFields(ctx)).returning().get();
  };

  return {
    async get() {
      return ensure();
    },

    async update(patch) {
      const current = ensure();
      return db
        .update(settings)
        .set({ ...patch, updatedAt: ctx.now() })
        .where(eq(settings.id, current.id))
        .returning()
        .get();
    },
  };
}
