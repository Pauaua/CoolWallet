import { getFinancialPeriod, getPreviousPeriod, type IsoDate, type PeriodMode, type TransactionType } from '@/lib/finance';
import type { TransactionFilter } from '@/services/types';

export type HistoryRangePreset = 'period' | 'previous' | 'last3' | 'all';
export type HistoryTypeFilter = 'all' | 'income' | 'expenses' | 'debts' | 'adjustments';

export const HISTORY_RANGE_OPTIONS: readonly { value: HistoryRangePreset; label: string }[] = [
  { value: 'period', label: 'Este mes' },
  { value: 'previous', label: 'Mes anterior' },
  { value: 'last3', label: 'Últimos 3 meses' },
  { value: 'all', label: 'Todo' },
];

export const HISTORY_TYPE_OPTIONS: readonly { value: HistoryTypeFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'income', label: 'Ingresos' },
  { value: 'expenses', label: 'Gastos' },
  { value: 'debts', label: 'Deudas' },
  { value: 'adjustments', label: 'Ajustes' },
];

const TYPES_BY_FILTER: Record<HistoryTypeFilter, readonly TransactionType[] | undefined> = {
  all: undefined,
  income: ['income'],
  expenses: ['fixed_expense', 'ant_expense'],
  debts: ['debt_payment'],
  adjustments: ['adjustment'],
};

/** Rango de fechas de un preset, en meses financieros. `all` = sin límite. */
export function getHistoryRange(
  preset: HistoryRangePreset,
  today: IsoDate,
  payDay: number,
  mode: PeriodMode,
): { from?: IsoDate; to?: IsoDate } {
  if (preset === 'all') return {};
  const current = getFinancialPeriod(today, payDay, mode);
  if (preset === 'period') return { from: current.start, to: current.end };
  const previous = getPreviousPeriod(current, payDay, mode);
  if (preset === 'previous') return { from: previous.start, to: previous.end };
  return { from: getPreviousPeriod(previous, payDay, mode).start, to: current.end };
}

/** Filtro del repositorio para la combinación elegida en el historial. */
export function buildHistoryFilter(options: {
  preset: HistoryRangePreset;
  type: HistoryTypeFilter;
  categoryId: string | null;
  today: IsoDate;
  payDay: number;
  mode: PeriodMode;
}): TransactionFilter {
  return {
    ...getHistoryRange(options.preset, options.today, options.payDay, options.mode),
    types: TYPES_BY_FILTER[options.type],
    categoryIds: options.categoryId ? [options.categoryId] : undefined,
  };
}
