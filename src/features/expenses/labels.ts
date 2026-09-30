import type { IconName } from '@/components/Icon';
import type { OccurrenceStatus } from '@/lib/finance';
import type { ColorTokens } from '@/theme';
import type { BudgetGroup, CategoryColor, CategoryKind } from '@/types/enums';

export const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'bimonthly', label: 'Bimestral' },
  { value: 'annual', label: 'Anual' },
] as const;

export const CATEGORY_KIND_OPTIONS: readonly { value: CategoryKind; label: string; description: string }[] = [
  { value: 'fixed', label: 'Gasto fijo', description: 'Arriendo, cuentas, suscripciones' },
  { value: 'variable', label: 'Gasto variable', description: 'Café, delivery, salidas' },
  { value: 'general', label: 'Ambos', description: 'Sirve para gastos fijos y variables' },
  { value: 'income', label: 'Ingreso', description: 'Sueldo, ventas, bonos' },
];

export const BUDGET_GROUP_OPTIONS: readonly { value: BudgetGroup; label: string }[] = [
  { value: 'needs', label: 'Necesidad' },
  { value: 'wants', label: 'Deseo' },
  { value: 'savings', label: 'Ahorro' },
];

/** Íconos disponibles para categorías (Feather). */
export const CATEGORY_ICONS: readonly IconName[] = [
  'home', 'zap', 'droplet', 'wifi', 'smartphone', 'tv', 'music', 'film', 'book-open', 'heart',
  'shield', 'truck', 'navigation', 'map-pin', 'shopping-cart', 'shopping-bag', 'coffee', 'package', 'gift', 'scissors',
  'tool', 'briefcase', 'dollar-sign', 'plus-circle', 'credit-card', 'globe', 'sun', 'umbrella', 'award', 'more-horizontal',
];

/** Texto, color e ícono de cada estado de vencimiento (nunca solo color). */
export const OCCURRENCE_STATUS_META: Record<OccurrenceStatus, { label: (days: number) => string; color: keyof ColorTokens; icon: IconName }> = {
  paid: { label: () => 'Pagado', color: 'primary', icon: 'check-circle' },
  overdue: { label: () => 'Vencido', color: 'danger', icon: 'alert-circle' },
  due_today: { label: () => 'Vence hoy', color: 'warningText', icon: 'clock' },
  due_soon: { label: (days) => (days === 1 ? 'Vence mañana' : `Vence en ${days} días`), color: 'warningText', icon: 'clock' },
  upcoming: { label: () => 'Pendiente', color: 'textSecondary', icon: 'circle' },
};

/** Nombres en español de los colores de categoría (para lectores de pantalla). */
export const CATEGORY_COLOR_LABELS: Record<CategoryColor, string> = {
  forest: 'Verde bosque',
  emerald: 'Esmeralda',
  mint: 'Menta',
  teal: 'Azul petróleo',
  olive: 'Oliva',
  amber: 'Ámbar',
  clay: 'Arcilla',
  rose: 'Rosa',
  plum: 'Ciruela',
  sky: 'Azul cielo',
  sage: 'Salvia (neutro)',
  slate: 'Pizarra (neutro)',
};

/** Nombres en español de los íconos de categoría. */
export const CATEGORY_ICON_LABELS: Partial<Record<IconName, string>> = {
  home: 'Casa',
  zap: 'Electricidad',
  droplet: 'Agua',
  wifi: 'Internet',
  smartphone: 'Teléfono',
  tv: 'Televisión',
  music: 'Música',
  film: 'Cine',
  'book-open': 'Libro',
  heart: 'Salud',
  shield: 'Seguro',
  truck: 'Transporte',
  navigation: 'Viaje',
  'map-pin': 'Lugar',
  'shopping-cart': 'Supermercado',
  'shopping-bag': 'Compras',
  coffee: 'Café',
  package: 'Delivery',
  gift: 'Regalo',
  scissors: 'Peluquería',
  tool: 'Mantención',
  briefcase: 'Trabajo',
  'dollar-sign': 'Dinero',
  'plus-circle': 'Extra',
  'credit-card': 'Tarjeta',
  globe: 'Viajes',
  sun: 'Vacaciones',
  umbrella: 'Imprevistos',
  award: 'Logro',
  'more-horizontal': 'Otros',
};
