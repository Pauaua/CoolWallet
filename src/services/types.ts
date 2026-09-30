import type { CategoryKind } from '@/types/enums';
import type {
  Account,
  AccountInput,
  Category,
  CategoryInput,
  Profile,
  ProfileInput,
  Settings,
  SettingsPatch,
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
  data: DataRepository;
};
