import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import {
  ACCOUNT_TYPES,
  BUDGET_GROUPS,
  CATEGORY_KINDS,
  CONTRACT_TERMS,
  CONTRACT_TYPES,
  DEBT_KINDS,
  FIXED_EXPENSE_STATUSES,
  HEALTH_SYSTEMS,
  PERIOD_MODES,
  RECURRING_FREQUENCIES,
  THEME_PREFERENCES,
  TRANSACTION_TYPES,
} from '../types/enums';

/**
 * Esquema local (SQLite). Reglas:
 * - IDs UUID en texto (nunca autoincrementales).
 * - `created_at`, `updated_at`, `deleted_at` en todas las tablas (borrado lógico).
 * - Montos en pesos enteros (INTEGER). Fechas de calendario `yyyy-MM-dd`; timestamps ISO 8601 completos.
 *
 * Tras cambiar este archivo: `npm run db:generate` para crear la migración.
 */
const timestamps = {
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
};

const id = () => text('id').primaryKey();

/** Perfil de la persona (una sola fila). */
export const profile = sqliteTable('profile', {
  id: id(),
  name: text('name').notNull(),
  photoUri: text('photo_uri'),
  grossSalary: integer('gross_salary').notNull().default(0),
  payDay: integer('pay_day').notNull().default(1),
  contractType: text('contract_type', { enum: CONTRACT_TYPES }).notNull().default('dependiente'),
  contractTerm: text('contract_term', { enum: CONTRACT_TERMS }).notNull().default('indefinite'),
  afpName: text('afp_name'),
  afpCommissionRate: real('afp_commission_rate').notNull().default(0),
  healthSystem: text('health_system', { enum: HEALTH_SYSTEMS }).notNull().default('fonasa'),
  isapreUf: real('isapre_uf'),
  hasUnemploymentInsurance: integer('has_unemployment_insurance', { mode: 'boolean' }).notNull().default(true),
  otherIncome: integer('other_income').notNull().default(0),
  ...timestamps,
});

/** Configuración de la app (una sola fila). */
export const settings = sqliteTable('settings', {
  id: id(),
  currency: text('currency').notNull().default('CLP'),
  periodMode: text('period_mode', { enum: PERIOD_MODES }).notNull().default('payday'),
  theme: text('theme', { enum: THEME_PREFERENCES }).notNull().default('system'),
  notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' }).notNull().default(false),
  biometricsEnabled: integer('biometrics_enabled', { mode: 'boolean' }).notNull().default(false),
  /** Minutos en segundo plano antes de bloquear (0 = inmediato). */
  lockTimeoutMinutes: integer('lock_timeout_minutes').notNull().default(1),
  /** Cada cuántos días recordar respaldar (0 = nunca). */
  backupReminderDays: integer('backup_reminder_days').notNull().default(14),
  lastBackupAt: text('last_backup_at'),
  ufValue: integer('uf_value'),
  utmValue: integer('utm_value'),
  indicatorsAsOf: text('indicators_as_of'),
  onboardingCompletedAt: text('onboarding_completed_at'),
  ...timestamps,
});

export const accounts = sqliteTable('accounts', {
  id: id(),
  name: text('name').notNull(),
  type: text('type', { enum: ACCOUNT_TYPES }).notNull(),
  initialBalance: integer('initial_balance').notNull().default(0),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
});

export const categories = sqliteTable('categories', {
  id: id(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  kind: text('kind', { enum: CATEGORY_KINDS }).notNull(),
  budgetGroup: text('budget_group', { enum: BUDGET_GROUPS }),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
});

export const transactions = sqliteTable(
  'transactions',
  {
    id: id(),
    type: text('type', { enum: TRANSACTION_TYPES }).notNull(),
    /** Pesos enteros; positivo salvo en `adjustment`. */
    amount: integer('amount').notNull(),
    /** Fecha del movimiento `yyyy-MM-dd`. */
    date: text('date').notNull(),
    accountId: text('account_id').references(() => accounts.id),
    categoryId: text('category_id').references(() => categories.id),
    note: text('note'),
    fixedExpenseId: text('fixed_expense_id').references(() => fixedExpenses.id),
    debtId: text('debt_id').references(() => debts.id),
    /** Ingreso de sueldo registrado con "¿Recibiste tu sueldo?" (uno por período). */
    isSalary: integer('is_salary', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index('transactions_date_idx').on(table.date),
    index('transactions_account_idx').on(table.accountId),
    index('transactions_category_idx').on(table.categoryId),
    index('transactions_type_date_idx').on(table.type, table.date),
  ],
);

export const fixedExpenses = sqliteTable('fixed_expenses', {
  id: id(),
  name: text('name').notNull(),
  amount: integer('amount').notNull(),
  categoryId: text('category_id').references(() => categories.id),
  accountId: text('account_id').references(() => accounts.id),
  dueDay: integer('due_day').notNull(),
  frequency: text('frequency', { enum: RECURRING_FREQUENCIES }).notNull().default('monthly'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  note: text('note'),
  ...timestamps,
});

/** Vencimiento generado de un gasto fijo en un período, con su estado. */
export const fixedExpenseOccurrences = sqliteTable(
  'fixed_expense_occurrences',
  {
    id: id(),
    fixedExpenseId: text('fixed_expense_id')
      .notNull()
      .references(() => fixedExpenses.id),
    dueDate: text('due_date').notNull(),
    amount: integer('amount').notNull(),
    status: text('status', { enum: FIXED_EXPENSE_STATUSES }).notNull().default('pending'),
    transactionId: text('transaction_id').references(() => transactions.id),
    paidAt: text('paid_at'),
    ...timestamps,
  },
  (table) => [uniqueIndex('fixed_expense_occurrences_unique_idx').on(table.fixedExpenseId, table.dueDate)],
);

export const debts = sqliteTable('debts', {
  id: id(),
  kind: text('kind', { enum: DEBT_KINDS }).notNull(),
  name: text('name').notNull(),
  creditor: text('creditor'),
  /** Monto adeudado o financiado. */
  principal: integer('principal').notNull(),
  installmentsTotal: integer('installments_total'),
  /** Cuotas pagadas antes de registrar la deuda en la app. */
  installmentsPaidInitial: integer('installments_paid_initial').notNull().default(0),
  installmentAmount: integer('installment_amount'),
  monthlyRate: real('monthly_rate'),
  /** Fecha en que se contrajo la deuda (`yyyy-MM-dd`). */
  startDate: text('start_date'),
  firstPaymentDate: text('first_payment_date'),
  dueDate: text('due_date'),
  accountId: text('account_id').references(() => accounts.id),
  note: text('note'),
  ...timestamps,
});

export const debtPayments = sqliteTable(
  'debt_payments',
  {
    id: id(),
    debtId: text('debt_id')
      .notNull()
      .references(() => debts.id),
    amount: integer('amount').notNull(),
    date: text('date').notNull(),
    accountId: text('account_id').references(() => accounts.id),
    transactionId: text('transaction_id').references(() => transactions.id),
    /** Si el pago corresponde a una cuota (deudas en cuotas). */
    isInstallment: integer('is_installment', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (table) => [index('debt_payments_debt_idx').on(table.debtId)],
);

export const budgets = sqliteTable(
  'budgets',
  {
    id: id(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    monthlyLimit: integer('monthly_limit').notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('budgets_category_idx').on(table.categoryId).where(sql`deleted_at IS NULL`)],
);

export const savingsGoals = sqliteTable('savings_goals', {
  id: id(),
  name: text('name').notNull(),
  targetAmount: integer('target_amount').notNull(),
  savedAmount: integer('saved_amount').notNull().default(0),
  targetDate: text('target_date'),
  icon: text('icon').notNull().default('target'),
  color: text('color').notNull().default('forest'),
  ...timestamps,
});

/** Tablas en orden seguro para insertar (padres antes que hijos). Lo usan el respaldo y el borrado total. */
export const ALL_TABLES = [
  profile,
  settings,
  accounts,
  categories,
  fixedExpenses,
  debts,
  transactions,
  fixedExpenseOccurrences,
  debtPayments,
  budgets,
  savingsGoals,
] as const;
