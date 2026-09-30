import type { FixedExpense, FixedExpenseOccurrence, Transaction } from '@/types/models';

import { buildCategoryAnalysis, buildFixedRows, buildVariableAnalysis } from '../expensesAnalysis';

const stamp = { createdAt: '', updatedAt: '', deletedAt: null };
let counter = 0;
const tx = (categoryId: string | null, amount: number): Transaction => {
  counter += 1;
  return { id: `t${counter}`, type: 'variable_expense', amount, date: '2026-09-10', accountId: null, categoryId, note: null, fixedExpenseId: null, debtId: null, isSalary: false, ...stamp };
};

describe('buildCategoryAnalysis', () => {
  it('reparte por categoría y compara con el mes anterior', () => {
    const analysis = buildCategoryAnalysis([tx('delivery', 36_900), tx('coffee', 13_100)], [tx('delivery', 30_000), tx('coffee', 20_000)]);
    expect(analysis.total).toBe(50_000);
    expect(analysis.breakdown[0]).toEqual({ categoryId: 'delivery', total: 36_900, percentage: 73.8 });
    expect(analysis.totalComparison).toEqual({ difference: 0, percentage: 0, trend: 'equal' });
    expect(analysis.categoryChanges[0]).toMatchObject({ categoryId: 'delivery', percentage: 23, trend: 'up' });
  });
});

describe('buildVariableAnalysis', () => {
  it('top 3 con costo anual proyectado y el impacto total', () => {
    const current = [tx('coffee', 25_000), tx('delivery', 20_000), tx('apps', 5_000), tx('snacks', 1_000), tx(null, 50_000)];
    const analysis = buildVariableAnalysis({ current, previous: [], incomeBase: 1_000_000, daysElapsed: 10, daysInPeriod: 30 });
    // Sin categoría no entra al top.
    expect(analysis.topCategories).toEqual([
      { categoryId: 'coffee', total: 25_000, projectedAnnual: 900_000 },
      { categoryId: 'delivery', total: 20_000, projectedAnnual: 720_000 },
      { categoryId: 'apps', total: 5_000, projectedAnnual: 180_000 },
    ]);
    expect(analysis.impact).toMatchObject({ total: 101_000, projectedMonthly: 303_000, projectedAnnual: 3_636_000 });
    expect(analysis.impact.percentageOfIncome).toBeCloseTo(10.1, 10);
    expect(analysis.totalComparison.percentage).toBeNull();
  });
});

describe('buildFixedRows', () => {
  const expense = (id: string, name: string): FixedExpense => ({
    id,
    name,
    amount: 1,
    categoryId: null,
    accountId: null,
    dueDay: 1,
    frequency: 'monthly',
    startDate: '2026-01-01',
    endDate: null,
    active: true,
    note: null,
    ...stamp,
  });
  const occurrence = (id: string, fixedExpenseId: string, dueDate: string, status: 'paid' | 'pending'): FixedExpenseOccurrence => ({
    id,
    fixedExpenseId,
    dueDate,
    amount: 1,
    status,
    transactionId: null,
    paidAt: null,
    ...stamp,
  });

  it('pendientes primero por fecha, luego pagados, con su estado', () => {
    const rows = buildFixedRows(
      [occurrence('o1', 'rent', '2026-09-05', 'paid'), occurrence('o2', 'net', '2026-10-02', 'pending'), occurrence('o3', 'gym', '2026-09-28', 'pending')],
      [expense('rent', 'Arriendo'), expense('net', 'Internet')],
      '2026-09-30',
    );
    expect(rows.map((row) => [row.occurrence.id, row.status, row.expense?.name])).toEqual([
      ['o3', 'overdue', undefined],
      ['o2', 'due_soon', 'Internet'],
      ['o1', 'paid', 'Arriendo'],
    ]);
  });
});
