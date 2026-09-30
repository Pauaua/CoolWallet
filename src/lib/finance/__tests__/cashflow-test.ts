import {
  calcAvailableBalance,
  calcDailyAverage,
  calcMonthlySpent,
  calcSafeDailySpend,
  calcSavingsRate,
  calcSpendingPercentage,
  compareWithPreviousPeriod,
  filterByPeriod,
  projectEndOfMonth,
  sumByCategory,
  sumByType,
  UNCATEGORIZED,
} from '../cashflow';
import type { FinancialPeriod } from '../period';
import type { FinanceTransaction } from '../types';

const september: FinancialPeriod = { start: '2026-09-01', end: '2026-09-30', daysInPeriod: 30 };

const transactions: FinanceTransaction[] = [
  { type: 'income', amount: 1_000_000, date: '2026-09-01', categoryId: null },
  { type: 'fixed_expense', amount: 300_000, date: '2026-09-05', categoryId: 'rent' },
  { type: 'variable_expense', amount: 2_500, date: '2026-09-10', categoryId: 'coffee' },
  { type: 'variable_expense', amount: 3_500, date: '2026-09-30T22:00:00.000Z', categoryId: 'coffee' },
  { type: 'variable_expense', amount: 9_000, date: '2026-10-01', categoryId: 'coffee' },
  { type: 'debt_payment', amount: 50_000, date: '2026-09-15', categoryId: null },
  { type: 'adjustment', amount: -10_000, date: '2026-09-20', categoryId: null },
];

describe('sumByType', () => {
  it('suma solo el tipo pedido', () => {
    expect(sumByType(transactions, 'variable_expense')).toBe(15_000);
    expect(sumByType(transactions, 'adjustment')).toBe(-10_000);
  });

  it('devuelve 0 sin movimientos', () => {
    expect(sumByType([], 'income')).toBe(0);
  });
});

describe('sumByCategory', () => {
  it('agrupa por categoría y usa "uncategorized" para las vacías', () => {
    expect(sumByCategory(transactions.filter((tx) => tx.type !== 'adjustment'))).toEqual({
      rent: 300_000,
      coffee: 15_000,
      [UNCATEGORIZED]: 1_050_000,
    });
  });

  it('devuelve objeto vacío sin movimientos', () => {
    expect(sumByCategory([])).toEqual({});
  });
});

describe('filterByPeriod', () => {
  it('incluye los bordes e ignora la hora', () => {
    expect(filterByPeriod(transactions, september)).toHaveLength(6);
  });
});

describe('calcMonthlySpent', () => {
  it('suma gastos fijos y variables del período, sin deudas ni ajustes', () => {
    expect(calcMonthlySpent(transactions, september)).toBe(306_000);
  });

  it('devuelve 0 si no hay gastos', () => {
    expect(calcMonthlySpent([], september)).toBe(0);
  });
});

describe('calcAvailableBalance', () => {
  it('ingresos − gastos − deudas + ajustes', () => {
    expect(calcAvailableBalance(1_000_000, 306_000, 50_000, -10_000)).toBe(634_000);
  });

  it('puede ser negativo', () => {
    expect(calcAvailableBalance(100, 500, 0, 0)).toBe(-400);
  });
});

describe('calcSpendingPercentage', () => {
  it('calcula el %', () => {
    expect(calcSpendingPercentage(250_000, 1_000_000)).toBe(25);
    expect(calcSpendingPercentage(1_500_000, 1_000_000)).toBe(150);
  });

  it('devuelve null sin ingreso', () => {
    expect(calcSpendingPercentage(100, 0)).toBeNull();
    expect(calcSpendingPercentage(100, -1)).toBeNull();
  });
});

describe('calcDailyAverage', () => {
  it('divide y redondea', () => {
    expect(calcDailyAverage(100_000, 3)).toBe(33_333);
    expect(calcDailyAverage(100_001, 2)).toBe(50_001);
  });

  it('devuelve 0 sin días transcurridos', () => {
    expect(calcDailyAverage(100_000, 0)).toBe(0);
    expect(calcDailyAverage(100_000, -2)).toBe(0);
  });
});

describe('calcSafeDailySpend', () => {
  it('redondea hacia abajo para no pasarse', () => {
    expect(calcSafeDailySpend(100_000, 3)).toBe(33_333);
    expect(calcSafeDailySpend(99_999, 2)).toBe(49_999);
  });

  it('devuelve 0 sin saldo o sin días', () => {
    expect(calcSafeDailySpend(0, 10)).toBe(0);
    expect(calcSafeDailySpend(-5_000, 10)).toBe(0);
    expect(calcSafeDailySpend(5_000, 0)).toBe(0);
  });
});

describe('projectEndOfMonth', () => {
  it('proyecta al ritmo actual', () => {
    expect(projectEndOfMonth(300_000, 10, 30, 1_000_000)).toEqual({ projectedSpent: 900_000, projectedBalance: 100_000 });
  });

  it('puede proyectar déficit', () => {
    expect(projectEndOfMonth(500_000, 10, 30, 1_000_000).projectedBalance).toBe(-500_000);
  });

  it('sin días transcurridos proyecta lo gastado', () => {
    expect(projectEndOfMonth(20_000, 0, 30, 100_000)).toEqual({ projectedSpent: 20_000, projectedBalance: 80_000 });
  });

  it('si el período terminó no extrapola', () => {
    expect(projectEndOfMonth(600_000, 45, 30, 1_000_000).projectedSpent).toBe(600_000);
  });
});

describe('calcSavingsRate', () => {
  it('calcula la tasa, incluso negativa', () => {
    expect(calcSavingsRate(1_000_000, 800_000)).toBe(20);
    expect(calcSavingsRate(1_000_000, 1_200_000)).toBe(-20);
  });

  it('devuelve null sin ingreso', () => {
    expect(calcSavingsRate(0, 100)).toBeNull();
  });
});

describe('compareWithPreviousPeriod', () => {
  it('detecta alzas', () => {
    expect(compareWithPreviousPeriod(123_000, 100_000)).toEqual({ difference: 23_000, percentage: 23, trend: 'up' });
  });

  it('detecta bajas', () => {
    expect(compareWithPreviousPeriod(50_000, 100_000)).toEqual({ difference: -50_000, percentage: -50, trend: 'down' });
  });

  it('sin cambios', () => {
    expect(compareWithPreviousPeriod(100, 100)).toEqual({ difference: 0, percentage: 0, trend: 'equal' });
  });

  it('sin período anterior el % es null', () => {
    expect(compareWithPreviousPeriod(100, 0)).toEqual({ difference: 100, percentage: null, trend: 'up' });
  });

  it('usa el valor absoluto del anterior si es negativo', () => {
    expect(compareWithPreviousPeriod(0, -100).percentage).toBe(100);
  });
});
