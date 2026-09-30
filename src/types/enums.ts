import type { ContractTerm, ContractType, DebtKind, HealthSystem, PeriodMode, RecurringFrequency, TransactionType } from '../lib/finance';

/**
 * Valores permitidos de las columnas tipo "enum" de la base de datos.
 * Los que también usa `lib/finance` se validan contra sus tipos con `satisfies`.
 */
export const TRANSACTION_TYPES = ['income', 'fixed_expense', 'ant_expense', 'debt_payment', 'adjustment'] as const satisfies readonly TransactionType[];
export const DEBT_KINDS = ['pending', 'installment', 'variable'] as const satisfies readonly DebtKind[];
export const RECURRING_FREQUENCIES = ['monthly', 'bimonthly', 'annual'] as const satisfies readonly RecurringFrequency[];
export const CONTRACT_TYPES = ['dependiente', 'honorarios'] as const satisfies readonly ContractType[];
export const CONTRACT_TERMS = ['indefinite', 'fixedTerm'] as const satisfies readonly ContractTerm[];
export const HEALTH_SYSTEMS = ['fonasa', 'isapre'] as const satisfies readonly HealthSystem[];
export const PERIOD_MODES = ['calendar', 'payday'] as const satisfies readonly PeriodMode[];

export const ACCOUNT_TYPES = ['checking', 'cash', 'credit_card', 'savings'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** Uso de una categoría: gasto fijo, gasto hormiga, ingreso o general (ambos tipos de gasto). */
export const CATEGORY_KINDS = ['fixed', 'ant', 'income', 'general'] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

/** Grupo de la regla 50/30/20. */
export const BUDGET_GROUPS = ['needs', 'wants', 'savings'] as const;
export type BudgetGroup = (typeof BUDGET_GROUPS)[number];

export const FIXED_EXPENSE_STATUSES = ['pending', 'paid'] as const;
export type FixedExpenseStatus = (typeof FIXED_EXPENSE_STATUSES)[number];

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;

/** Colores de categoría: claves de la paleta de `src/theme/categoryColors.ts`. */
export const CATEGORY_COLORS = ['forest', 'emerald', 'mint', 'teal', 'sage', 'olive', 'amber', 'clay', 'rose', 'plum', 'sky', 'slate'] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];
