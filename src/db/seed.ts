import type { AccountInput, CategoryInput } from '@/types/models';

type SeedCategory = Omit<CategoryInput, 'isDefault' | 'sortOrder'>;

/** Categorías por defecto (íconos Feather, colores de la paleta de categorías). */
export const DEFAULT_CATEGORIES: readonly SeedCategory[] = [
  // Gastos fijos
  { name: 'Arriendo o dividendo', icon: 'home', color: 'forest', kind: 'fixed', budgetGroup: 'needs' },
  { name: 'Cuentas básicas', icon: 'zap', color: 'amber', kind: 'fixed', budgetGroup: 'needs' },
  { name: 'Internet y telefonía', icon: 'wifi', color: 'teal', kind: 'fixed', budgetGroup: 'needs' },
  { name: 'Suscripciones', icon: 'tv', color: 'plum', kind: 'fixed', budgetGroup: 'wants' },
  { name: 'Educación', icon: 'book-open', color: 'sky', kind: 'fixed', budgetGroup: 'needs' },
  { name: 'Salud y seguros', icon: 'heart', color: 'rose', kind: 'fixed', budgetGroup: 'needs' },
  { name: 'Transporte', icon: 'truck', color: 'slate', kind: 'general', budgetGroup: 'needs' },
  { name: 'Supermercado', icon: 'shopping-cart', color: 'emerald', kind: 'general', budgetGroup: 'needs' },
  // Gastos hormiga
  { name: 'Café', icon: 'coffee', color: 'clay', kind: 'ant', budgetGroup: 'wants' },
  { name: 'Snacks', icon: 'shopping-bag', color: 'amber', kind: 'ant', budgetGroup: 'wants' },
  { name: 'Delivery', icon: 'package', color: 'rose', kind: 'ant', budgetGroup: 'wants' },
  { name: 'Apps y juegos', icon: 'smartphone', color: 'plum', kind: 'ant', budgetGroup: 'wants' },
  { name: 'Transporte ocasional', icon: 'navigation', color: 'sky', kind: 'ant', budgetGroup: 'wants' },
  { name: 'Salidas', icon: 'film', color: 'mint', kind: 'ant', budgetGroup: 'wants' },
  { name: 'Otros', icon: 'more-horizontal', color: 'sage', kind: 'general', budgetGroup: 'wants' },
  // Ingresos
  { name: 'Sueldo', icon: 'briefcase', color: 'forest', kind: 'income', budgetGroup: null },
  { name: 'Ingreso extra', icon: 'plus-circle', color: 'emerald', kind: 'income', budgetGroup: null },
];

export const DEFAULT_ACCOUNTS: readonly AccountInput[] = [
  { name: 'Cuenta corriente', type: 'checking', initialBalance: 0, icon: 'credit-card', color: 'forest', sortOrder: 0 },
  { name: 'Efectivo', type: 'cash', initialBalance: 0, icon: 'dollar-sign', color: 'emerald', sortOrder: 1 },
];
