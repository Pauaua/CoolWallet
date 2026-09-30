import type { RepositoryContext } from '../context';
import type { Repositories } from '../types';

import { createAccountsRepository } from './accountsRepository';
import { createCategoriesRepository } from './categoriesRepository';
import { createDataRepository } from './dataRepository';
import { createDebtsRepository } from './debtsRepository';
import { createFixedExpensesRepository } from './fixedExpensesRepository';
import { createProfileRepository } from './profileRepository';
import { createSettingsRepository } from './settingsRepository';
import { createTransactionsRepository } from './transactionsRepository';

/** Repositorios respaldados por SQLite (Drizzle). */
export function createSqliteRepositories(ctx: RepositoryContext): Repositories {
  return {
    profile: createProfileRepository(ctx),
    settings: createSettingsRepository(ctx),
    accounts: createAccountsRepository(ctx),
    categories: createCategoriesRepository(ctx),
    transactions: createTransactionsRepository(ctx),
    fixedExpenses: createFixedExpensesRepository(ctx),
    debts: createDebtsRepository(ctx),
    data: createDataRepository(ctx),
  };
}
