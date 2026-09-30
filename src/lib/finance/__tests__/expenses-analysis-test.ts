import {
  calcCategoryBreakdown,
  calcFixedExpensesProgress,
  compareCategoriesWithPrevious,
  foldSmallCategories,
  getFrequentAmounts,
  getNextRecurringDueDate,
  getOccurrenceStatus,
  type RecurringExpenseDefinition,
} from '../expenses';
import type { FinanceTransaction } from '../types';

const expense = (categoryId: string | null, amount: number): FinanceTransaction => ({ type: 'variable_expense', amount, date: '2026-09-10', categoryId });

describe('getNextRecurringDueDate', () => {
  const base: RecurringExpenseDefinition = { id: 'x', amount: 1, dueDay: 5, frequency: 'monthly', startDate: '2026-01-01', active: true };

  it('mensual: el próximo día de vencimiento', () => {
    expect(getNextRecurringDueDate(base, '2026-09-30')).toBe('2026-10-05');
    expect(getNextRecurringDueDate(base, '2026-10-05')).toBe('2026-10-05');
  });

  it('anual: puede estar a varios meses', () => {
    expect(getNextRecurringDueDate({ ...base, frequency: 'annual', dueDay: 15, startDate: '2026-03-15' }, '2026-09-30')).toBe('2027-03-15');
  });

  it('inactivo o terminado: sin próximo vencimiento', () => {
    expect(getNextRecurringDueDate({ ...base, active: false }, '2026-09-30')).toBeNull();
    expect(getNextRecurringDueDate({ ...base, endDate: '2026-09-30' }, '2026-09-30')).toBeNull();
  });
});

describe('getOccurrenceStatus', () => {
  it('clasifica según la fecha y si está pagado', () => {
    expect(getOccurrenceStatus('2026-09-01', true, '2026-09-30')).toBe('paid');
    expect(getOccurrenceStatus('2026-09-29', false, '2026-09-30')).toBe('overdue');
    expect(getOccurrenceStatus('2026-09-30', false, '2026-09-30')).toBe('due_today');
    expect(getOccurrenceStatus('2026-10-03', false, '2026-09-30')).toBe('due_soon');
    expect(getOccurrenceStatus('2026-10-04', false, '2026-09-30')).toBe('upcoming');
    expect(getOccurrenceStatus('2026-10-04', false, '2026-09-30', 7)).toBe('due_soon');
  });
});

describe('calcFixedExpensesProgress', () => {
  it('suma pagado y pendiente', () => {
    expect(
      calcFixedExpensesProgress([
        { amount: 450_000, isPaid: true },
        { amount: 30_000, isPaid: false },
        { amount: 20_000, isPaid: false },
      ]),
    ).toEqual({ total: 500_000, paid: 450_000, pending: 50_000, paidCount: 1, pendingCount: 2, paidPercentage: 90 });
  });

  it('sin gastos fijos todo es 0', () => {
    expect(calcFixedExpensesProgress([])).toEqual({ total: 0, paid: 0, pending: 0, paidCount: 0, pendingCount: 0, paidPercentage: 0 });
  });
});

describe('getFrequentAmounts', () => {
  it('ordena los más usados y completa con valores por defecto', () => {
    expect(getFrequentAmounts([2_500, 2_500, 2_500, 1_200, 1_200, 8_990], 4, [1_000, 2_000])).toEqual([1_200, 2_500, 8_990, 1_000].sort((a, b) => a - b));
  });

  it('respeta el límite e ignora montos no positivos', () => {
    expect(getFrequentAmounts([0, -5, 3_000], 2, [1_000, 2_000, 5_000])).toEqual([1_000, 3_000]);
  });

  it('sin historial usa los valores por defecto', () => {
    expect(getFrequentAmounts([])).toEqual([1_000, 2_000, 3_000, 5_000, 10_000, 20_000]);
  });

  it('en empate de frecuencia prefiere el monto menor', () => {
    expect(getFrequentAmounts([5_000, 1_000], 1, [])).toEqual([1_000]);
  });
});

describe('calcCategoryBreakdown / foldSmallCategories', () => {
  const shares = calcCategoryBreakdown([expense('coffee', 30_000), expense('food', 50_000), expense('coffee', 20_000), expense(null, 0), expense('apps', 0)]);

  it('suma por categoría con su porcentaje, de mayor a menor', () => {
    expect(shares.slice(0, 2)).toEqual([
      { categoryId: 'coffee', total: 50_000, percentage: 50 },
      { categoryId: 'food', total: 50_000, percentage: 50 },
    ]);
  });

  it('sin gastos devuelve lista vacía', () => {
    expect(calcCategoryBreakdown([])).toEqual([]);
  });

  it('agrupa las porciones sobrantes en "otros"', () => {
    const many = calcCategoryBreakdown([expense('a', 40), expense('b', 30), expense('c', 20), expense('d', 10)]);
    expect(foldSmallCategories(many, 3, 'other')).toEqual([
      { categoryId: 'a', total: 40, percentage: 40 },
      { categoryId: 'b', total: 30, percentage: 30 },
      { categoryId: 'other', total: 30, percentage: 30 },
    ]);
    expect(foldSmallCategories(many, 4, 'other')).toHaveLength(4);
  });
});

describe('compareCategoriesWithPrevious', () => {
  it('muestra alzas, bajas y categorías nuevas o que desaparecen', () => {
    const current = calcCategoryBreakdown([expense('delivery', 36_900), expense('coffee', 10_000), expense('new', 5_000)]);
    const previous = calcCategoryBreakdown([expense('delivery', 30_000), expense('coffee', 20_000), expense('gone', 1_000)]);
    const result = compareCategoriesWithPrevious(current, previous);
    expect(result.map((item) => item.categoryId)).toEqual(['delivery', 'new', 'gone', 'coffee']);
    expect(result[0]).toMatchObject({ current: 36_900, previous: 30_000, difference: 6_900, percentage: 23, trend: 'up' });
    expect(result.find((item) => item.categoryId === 'new')?.percentage).toBeNull();
    expect(result.find((item) => item.categoryId === 'gone')).toMatchObject({ current: 0, trend: 'down' });
  });
});
