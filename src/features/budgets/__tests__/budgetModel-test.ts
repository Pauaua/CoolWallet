import type { Budget, Category, Transaction } from '@/types/models';

import { buildBudgetRows, calcBudgetTotals, compareWith503020, detectBudgetCrossing } from '../budgetModel';

const stamp = { createdAt: '', updatedAt: '', deletedAt: null };
const category = (id: string, budgetGroup: Category['budgetGroup']): Category => ({ id, name: id, icon: 'tag', color: 'sage', kind: 'variable', budgetGroup, isDefault: false, sortOrder: 0, ...stamp });
const budget = (categoryId: string, monthlyLimit: number): Budget => ({ id: `b-${categoryId}`, categoryId, monthlyLimit, ...stamp });
let n = 0;
const expense = (categoryId: string | null, amount: number): Transaction => {
  n += 1;
  return { id: `t${n}`, type: 'variable_expense', amount, date: '2026-09-10', accountId: null, categoryId, note: null, fixedExpenseId: null, debtId: null, isSalary: false, ...stamp };
};

const categories = [category('rent', 'needs'), category('food', 'needs'), category('coffee', 'wants'), category('fun', 'wants')];
const expenses = [expense('rent', 450_000), expense('food', 90_000), expense('coffee', 40_000), expense('coffee', 5_000), expense(null, 10_000)];

describe('buildBudgetRows / calcBudgetTotals', () => {
  it('uso, saldo y nivel de alerta por categoría, del más usado al menos', () => {
    const rows = buildBudgetRows([budget('food', 120_000), budget('coffee', 40_000), budget('fun', 30_000)], categories, expenses);
    expect(rows.map((row) => [row.budget.categoryId, row.spent, row.remaining, row.level])).toEqual([
      ['coffee', 45_000, -5_000, 'exceeded'],
      ['food', 90_000, 30_000, 'ok'],
      ['fun', 0, 30_000, 'ok'],
    ]);
    expect(rows[0]?.category?.id).toBe('coffee');
    expect(calcBudgetTotals(rows)).toEqual({ limit: 190_000, spent: 135_000, usage: (135_000 / 190_000) * 100, alerts: 1 });
  });

  it('sin presupuestos', () => {
    expect(calcBudgetTotals([])).toEqual({ limit: 0, spent: 0, usage: null, alerts: 0 });
  });
});

describe('compareWith503020', () => {
  it('compara cada grupo con su objetivo', () => {
    expect(compareWith503020(1_000_000, categories, expenses)).toEqual([
      { group: 'needs', target: 500_000, actual: 540_000, usage: 108 },
      { group: 'wants', target: 300_000, actual: 45_000, usage: 15 },
      { group: 'savings', target: 200_000, actual: 405_000, usage: 202.5 },
    ]);
  });

  it('el ahorro nunca es negativo', () => {
    expect(compareWith503020(100_000, categories, expenses)[2]).toMatchObject({ actual: 0 });
  });
});

describe('detectBudgetCrossing', () => {
  it('avisa solo al cruzar el 80% o el 100%', () => {
    expect(detectBudgetCrossing(70_000, 15_000, 100_000)).toBe('warning');
    expect(detectBudgetCrossing(85_000, 20_000, 100_000)).toBe('exceeded');
    expect(detectBudgetCrossing(70_000, 40_000, 100_000)).toBe('exceeded');
    expect(detectBudgetCrossing(85_000, 5_000, 100_000)).toBeNull();
    expect(detectBudgetCrossing(10_000, 5_000, 100_000)).toBeNull();
    expect(detectBudgetCrossing(0, 5_000, 0)).toBeNull();
  });
});
