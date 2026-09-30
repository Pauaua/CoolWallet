import type { RepositoryContext } from '../context';
import type { Repositories } from '../types';

import { createAccountsRepository } from './accountsRepository';
import { createCategoriesRepository } from './categoriesRepository';
import { createDataRepository } from './dataRepository';
import { createProfileRepository } from './profileRepository';
import { createSettingsRepository } from './settingsRepository';

/** Repositorios respaldados por SQLite (Drizzle). */
export function createSqliteRepositories(ctx: RepositoryContext): Repositories {
  return {
    profile: createProfileRepository(ctx),
    settings: createSettingsRepository(ctx),
    accounts: createAccountsRepository(ctx),
    categories: createCategoriesRepository(ctx),
    data: createDataRepository(ctx),
  };
}
