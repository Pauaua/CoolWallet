import type * as schema from '@/db/schema';

/** Campos que maneja el repositorio (no se editan desde la UI). */
type SystemFields = 'id' | 'createdAt' | 'updatedAt' | 'deletedAt';

export type Profile = typeof schema.profile.$inferSelect;
export type ProfileInput = Omit<Profile, SystemFields>;

export type Settings = typeof schema.settings.$inferSelect;
export type SettingsPatch = Partial<Omit<Settings, SystemFields>>;

export type Account = typeof schema.accounts.$inferSelect;
export type AccountInput = Omit<Account, SystemFields>;

export type Category = typeof schema.categories.$inferSelect;
export type CategoryInput = Omit<Category, SystemFields>;

export type FixedExpense = typeof schema.fixedExpenses.$inferSelect;
export type FixedExpenseInput = Omit<FixedExpense, SystemFields>;
export type FixedExpenseOccurrence = typeof schema.fixedExpenseOccurrences.$inferSelect;

export type Transaction = typeof schema.transactions.$inferSelect;
/** Datos de un movimiento nuevo; los vínculos a gastos fijos/deudas y el flag de sueldo son opcionales. */
export type TransactionInput = Omit<Transaction, SystemFields | 'fixedExpenseId' | 'debtId' | 'isSalary'> &
  Partial<Pick<Transaction, 'fixedExpenseId' | 'debtId' | 'isSalary'>>;
