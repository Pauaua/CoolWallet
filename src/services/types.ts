import type { IsoDate, TransactionType } from '@/lib/finance';
import type { CategoryKind } from '@/types/enums';
import type {
  Account,
  AccountInput,
  Category,
  CategoryInput,
  FixedExpense,
  FixedExpenseInput,
  FixedExpenseOccurrence,
  Profile,
  ProfileInput,
  Settings,
  SettingsPatch,
  Transaction,
  TransactionInput,
} from '@/types/models';

/**
 * Interfaces de acceso a datos. Son la ÚNICA puerta a los datos: pantallas y
 * hooks dependen de estas interfaces, nunca de SQLite. Una implementación en
 * la nube (ej. Supabase) solo tendría que cumplirlas.
 */

export interface ProfileRepository {
  /** El perfil, o `null` si aún no se crea (onboarding pendiente). */
  get(): Promise<Profile | null>;
  /** Crea o actualiza el perfil (fila única). */
  save(input: ProfileInput): Promise<Profile>;
}

export interface SettingsRepository {
  /** La configuración; si no existe, la crea con valores por defecto. */
  get(): Promise<Settings>;
  update(patch: SettingsPatch): Promise<Settings>;
}

export interface AccountsRepository {
  list(): Promise<Account[]>;
  getById(id: string): Promise<Account | null>;
  create(input: AccountInput): Promise<Account>;
  update(id: string, patch: Partial<AccountInput>): Promise<Account>;
  /** Borrado lógico. */
  remove(id: string): Promise<void>;
}

export type CategoryFilter = {
  /** Solo categorías de estos tipos. */
  kinds?: readonly CategoryKind[];
};

export interface CategoriesRepository {
  list(filter?: CategoryFilter): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  create(input: CategoryInput): Promise<Category>;
  update(id: string, patch: Partial<CategoryInput>): Promise<Category>;
  /** Borrado lógico. */
  remove(id: string): Promise<void>;
}

export type TransactionFilter = {
  /** Desde esta fecha (inclusive). */
  from?: IsoDate;
  /** Hasta esta fecha (inclusive). */
  to?: IsoDate;
  types?: readonly TransactionType[];
  categoryIds?: readonly string[];
  accountId?: string;
  /** Solo el ingreso de sueldo. */
  onlySalary?: boolean;
};

export interface TransactionsRepository {
  /** Movimientos activos, del más reciente al más antiguo. */
  list(filter?: TransactionFilter): Promise<Transaction[]>;
  getById(id: string): Promise<Transaction | null>;
  create(input: TransactionInput): Promise<Transaction>;
  update(id: string, patch: Partial<TransactionInput>): Promise<Transaction>;
  /** Borrado lógico. */
  remove(id: string): Promise<void>;
}

export type PayOccurrenceInput = {
  accountId: string | null;
  date: IsoDate;
  amount: number;
};

export interface FixedExpensesRepository {
  /** Gastos fijos no eliminados (activos e inactivos). */
  list(): Promise<FixedExpense[]>;
  getById(id: string): Promise<FixedExpense | null>;
  create(input: FixedExpenseInput): Promise<FixedExpense>;
  update(id: string, patch: Partial<FixedExpenseInput>): Promise<FixedExpense>;
  /** Borrado lógico; sus vencimientos pendientes se eliminan (los pagados se conservan). */
  remove(id: string): Promise<void>;
  /**
   * Deja los vencimientos pendientes del rango iguales a `expected`: crea los
   * que faltan, actualiza montos y borra los que ya no corresponden. Los pagados no se tocan.
   */
  syncOccurrences(range: { from: IsoDate; to: IsoDate }, expected: readonly { fixedExpenseId: string; dueDate: IsoDate; amount: number }[]): Promise<void>;
  /** Vencimientos del rango, por fecha. */
  listOccurrences(range: { from: IsoDate; to: IsoDate }): Promise<FixedExpenseOccurrence[]>;
  /** Marca pagado: crea el movimiento de gasto fijo y lo vincula. */
  markPaid(occurrenceId: string, payment: PayOccurrenceInput): Promise<Transaction>;
  /** Vuelve a pendiente y elimina el movimiento del pago. */
  markPending(occurrenceId: string): Promise<void>;
}

export interface DataRepository {
  /** Crea categorías y cuentas por defecto si la base está vacía. */
  seedDefaults(): Promise<void>;
  /** Borra físicamente TODOS los datos (restablecer la app). */
  wipeAll(): Promise<void>;
}

export type Repositories = {
  profile: ProfileRepository;
  settings: SettingsRepository;
  accounts: AccountsRepository;
  categories: CategoriesRepository;
  transactions: TransactionsRepository;
  fixedExpenses: FixedExpensesRepository;
  data: DataRepository;
};
