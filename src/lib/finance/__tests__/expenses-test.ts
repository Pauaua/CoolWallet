import {
  annualizeExpense,
  calcAntExpensesImpact,
  generateRecurringExpenses,
  toMonthlyAmount,
  type RecurringExpenseDefinition,
} from '../expenses';
import type { FinancialPeriod } from '../period';

describe('annualizeExpense', () => {
  it.each([
    ['daily', 2_500, 912_500],
    ['weekly', 10_000, 520_000],
    ['biweekly', 10_000, 260_000],
    ['monthly', 15_990, 191_880],
    ['bimonthly', 30_000, 180_000],
    ['quarterly', 30_000, 120_000],
    ['semiannual', 30_000, 60_000],
    ['annual', 30_000, 30_000],
  ] as const)('%s de %i → %i al año', (frequency, amount, expected) => {
    expect(annualizeExpense(amount, frequency)).toBe(expected);
  });

  it('cero se mantiene en cero', () => {
    expect(annualizeExpense(0, 'daily')).toBe(0);
  });
});

describe('toMonthlyAmount', () => {
  it('convierte a equivalente mensual', () => {
    expect(toMonthlyAmount(120_000, 'annual')).toBe(10_000);
    expect(toMonthlyAmount(10_000, 'weekly')).toBe(43_333);
    expect(toMonthlyAmount(20_000, 'monthly')).toBe(20_000);
  });
});

describe('calcAntExpensesImpact', () => {
  const coffees = [{ amount: 3_000 }, { amount: 2_500 }, { amount: 4_500 }];

  it('total, % del ingreso y proyección anual', () => {
    expect(calcAntExpensesImpact(coffees, 1_000_000)).toEqual({
      total: 10_000,
      percentageOfIncome: 1,
      projectedMonthly: 10_000,
      projectedAnnual: 120_000,
    });
  });

  it('proyecta el mes completo si se indica el avance', () => {
    expect(calcAntExpensesImpact(coffees, 1_000_000, { daysElapsed: 10, daysInPeriod: 30 })).toMatchObject({
      projectedMonthly: 30_000,
      projectedAnnual: 360_000,
    });
  });

  it('no proyecta si el período terminó o no ha empezado', () => {
    expect(calcAntExpensesImpact(coffees, 0, { daysElapsed: 30, daysInPeriod: 30 }).projectedMonthly).toBe(10_000);
    expect(calcAntExpensesImpact(coffees, 0, { daysElapsed: 0, daysInPeriod: 30 }).projectedMonthly).toBe(10_000);
  });

  it('sin ingreso el % es null; sin gastos todo es 0', () => {
    expect(calcAntExpensesImpact(coffees, 0).percentageOfIncome).toBeNull();
    expect(calcAntExpensesImpact([], 500_000)).toEqual({ total: 0, percentageOfIncome: 0, projectedMonthly: 0, projectedAnnual: 0 });
  });
});

describe('generateRecurringExpenses', () => {
  const september: FinancialPeriod = { start: '2026-09-01', end: '2026-09-30', daysInPeriod: 30 };
  const base: RecurringExpenseDefinition = {
    id: 'rent',
    amount: 450_000,
    dueDay: 5,
    frequency: 'monthly',
    startDate: '2026-01-01',
    active: true,
  };

  it('mensual: un vencimiento por período', () => {
    expect(generateRecurringExpenses([base], september)).toEqual([{ fixedExpenseId: 'rent', dueDate: '2026-09-05', amount: 450_000 }]);
  });

  it('ajusta el día 31 a meses de 30 días', () => {
    expect(generateRecurringExpenses([{ ...base, dueDay: 31 }], september)[0]?.dueDate).toBe('2026-09-30');
  });

  it('bimestral: cada 2 meses desde el primer vencimiento', () => {
    const water = { ...base, id: 'water', frequency: 'bimonthly' as const, dueDay: 10, startDate: '2026-01-10' };
    expect(generateRecurringExpenses([water], september)).toHaveLength(1);
    expect(generateRecurringExpenses([water], { start: '2026-10-01', end: '2026-10-31', daysInPeriod: 31 })).toHaveLength(0);
  });

  it('anual: solo en su mes', () => {
    const insurance = { ...base, id: 'insurance', frequency: 'annual' as const, dueDay: 15, startDate: '2025-03-15' };
    expect(generateRecurringExpenses([insurance], september)).toHaveLength(0);
    expect(generateRecurringExpenses([insurance], { start: '2026-03-01', end: '2026-03-31', daysInPeriod: 31 })).toEqual([
      { fixedExpenseId: 'insurance', dueDate: '2026-03-15', amount: 450_000 },
    ]);
  });

  it('respeta inicio, fin y estado activo', () => {
    expect(generateRecurringExpenses([{ ...base, startDate: '2026-09-10' }], september)).toHaveLength(0);
    expect(generateRecurringExpenses([{ ...base, endDate: '2026-08-31' }], september)).toHaveLength(0);
    expect(generateRecurringExpenses([{ ...base, endDate: null }], september)).toHaveLength(1);
    expect(generateRecurringExpenses([{ ...base, active: false }], september)).toHaveLength(0);
  });

  it('período desde el día de pago: toma los días de ambos meses, ordenados', () => {
    const period: FinancialPeriod = { start: '2026-09-25', end: '2026-10-24', daysInPeriod: 30 };
    const result = generateRecurringExpenses(
      [
        { ...base, id: 'internet', dueDay: 5 },
        { ...base, id: 'phone', dueDay: 28 },
        { ...base, id: 'first', dueDay: 25 },
        { ...base, id: 'last', dueDay: 24 },
      ],
      period,
    );
    expect(result.map((item) => [item.fixedExpenseId, item.dueDate])).toEqual([
      ['first', '2026-09-25'],
      ['phone', '2026-09-28'],
      ['internet', '2026-10-05'],
      ['last', '2026-10-24'],
    ]);
  });

  it('sin gastos fijos devuelve lista vacía', () => {
    expect(generateRecurringExpenses([], september)).toEqual([]);
  });
});
