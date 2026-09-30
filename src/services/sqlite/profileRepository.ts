import { isNull } from 'drizzle-orm';

import { profile } from '@/db/schema';
import type { Profile } from '@/types/models';

import { newRowFields, type RepositoryContext } from '../context';
import type { ProfileRepository } from '../types';

export function createProfileRepository(ctx: RepositoryContext): ProfileRepository {
  const { db } = ctx;

  const findCurrent = (): Profile | null => db.select().from(profile).where(isNull(profile.deletedAt)).limit(1).get() ?? null;

  return {
    async get() {
      return findCurrent();
    },

    async save(input) {
      const existing = findCurrent();
      if (existing) {
        const updated: Profile = { ...existing, ...input, updatedAt: ctx.now() };
        db.update(profile).set(updated).where(isNull(profile.deletedAt)).run();
        return updated;
      }
      const created: Profile = { ...input, ...newRowFields(ctx) };
      db.insert(profile).values(created).run();
      return created;
    },
  };
}
