import type { Account, Category, Debt, DebtPayment, Transaction } from '@/types/models';

import { csvFileName, toTransactionsCsv } from '../csv';
import { generateInsights } from '../insights';
import { buildMonthlyReports, calcDebtAt, getLastPeriods, type MonthReport } from '../reportsModel';

const stamp = { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '', deletedAt: null };
let n = 0;
const tx = (type: Transaction['type'], amount: number, date: string, categoryId: string | null = null, note: string | null = null): Transaction => {
  n += 1;
  return { id: `t${n}`, type, amount, date, accountId: 'main', categoryId, note, fixedExpenseId: null, debtId: null, isSalary: false, ...stamp };
};
const category = (id: string, name: string): Category => ({ id, name, icon: 'tag', color: 'sage', kind: 'variable', budgetGroup: 'wants', isDefault: false, sortOrder: 0, ...stamp });

describe('getLastPeriods', () => {
  it('seis meses financieros del más antiguo al actual', () => {
    const periods = getLastPeriods('2026-09-30', 1, 'calendar', 6);
    expect(periods.map((period) => period.start)).toEqual(['2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01']);
  });
});

describe('calcDebtAt', () => {
  const debt: Debt = {
    id: 'd',
    kind: 'pending',
    name: 'Juan',
    creditor: null,
    principal: 100_000,
    installmentsTotal: null,
    installmentsPaidInitial: 0,
    installmentAmount: null,
    monthlyRate: null,
    startDate: '2026-07-10',
    firstPaymentDate: null,
    dueDate: null,
    accountId: null,
    note: null,
    ...stamp,
  };
  const payment: DebtPayment = { id: 'p', debtId: 'd', amount: 30_000, date: '2026-08-15', accountId: null, transactionId: null, isInstallment: false, ...stamp };

  it('considera solo deudas contraídas y abonos hasta la fecha', () => {
    expect(calcDebtAt('2026-06-30', [debt], [payment])).toBe(0);
    expect(calcDebtAt('2026-07-31', [debt], [payment])).toBe(100_000);
    expect(calcDebtAt('2026-08-31', [debt], [payment])).toBe(70_000);
    expect(calcDebtAt('2026-01-02', [{ ...debt, startDate: null }], [])).toBe(100_000);
  });
});

describe('buildMonthlyReports', () => {
  it('flujo, tasa de ahorro y deuda por mes', () => {
    const reports = buildMonthlyReports({
      transactions: [tx('income', 1_000_000, '2026-09-01'), tx('variable_expense', 300_000, '2026-09-10'), tx('debt_payment', 100_000, '2026-09-11'), tx('income', 900_000, '2026-08-01')],
      debts: [],
      payments: [],
      payDay: 1,
      mode: 'calendar',
      today: '2026-09-30',
      months: 2,
    });
    expect(reports).toEqual([
      expect.objectContaining({ label: 'ago', income: 900_000, expenses: 0, debtPayments: 0, savingsRate: 100, debtAtEnd: 0 }),
      expect.objectContaining({ label: 'sep', income: 1_000_000, expenses: 300_000, debtPayments: 100_000, savingsRate: 60 }),
    ]);
  });
});

describe('generateInsights', () => {
  const categories = [category('delivery', 'Delivery'), category('fun', 'Salidas'), category('rent', 'Arriendo')];
  const month = (overrides: Partial<MonthReport>): MonthReport => ({
    period: { start: '2026-09-01', end: '2026-09-30', daysInPeriod: 30 },
    label: 'sep',
    income: 1_000_000,
    expenses: 400_000,
    debtPayments: 0,
    savingsRate: 60,
    debtAtEnd: 500_000,
    ...overrides,
  });

  it('alzas, bajas, mayor gasto, ahorro y deuda', () => {
    const insights = generateInsights({
      current: month({ savingsRate: 25, debtAtEnd: 450_000 }),
      previous: month({ savingsRate: 10, debtAtEnd: 500_000 }),
      currentExpenses: [tx('variable_expense', 36_900, '2026-09-05', 'delivery'), tx('variable_expense', 20_000, '2026-09-06', 'fun'), tx('fixed_expense', 300_000, '2026-09-05', 'rent')],
      previousExpenses: [tx('variable_expense', 30_000, '2026-08-05', 'delivery'), tx('variable_expense', 40_000, '2026-08-06', 'fun'), tx('fixed_expense', 300_000, '2026-08-05', 'rent')],
      categories,
    });
    expect(insights.map((insight) => insight.text)).toEqual([
      'Este mes gastaste 23% más en Delivery que el anterior (+$6.900).',
      'Bien: gastaste 50% menos en Salidas que el mes anterior.',
      'Tu mayor gasto del mes es Arriendo: 84% de todo lo que gastaste.',
      'Tu tasa de ahorro este mes va en 25% (mejor que el 10% del mes anterior).',
      'Tu deuda total bajó $50.000 desde el mes anterior.',
    ]);
  });

  it('gasto mayor al ingreso y deuda que sube; ignora cambios chicos', () => {
    const insights = generateInsights({
      current: month({ income: 500_000, expenses: 600_000, savingsRate: -20, debtAtEnd: 600_000 }),
      previous: month({ debtAtEnd: 500_000 }),
      currentExpenses: [tx('variable_expense', 3_000, '2026-09-05', 'delivery')],
      previousExpenses: [tx('variable_expense', 1_000, '2026-08-05', 'delivery')],
      categories,
    });
    expect(insights.map((insight) => insight.id)).toEqual(['top-delivery', 'savings-negative', 'debt-up']);
    expect(insights[1]?.text).toBe('Este mes estás gastando más de lo que ganas: $100.000 por sobre tus ingresos.');
  });

  it('sin datos no inventa observaciones', () => {
    expect(generateInsights({ current: month({ income: 0, savingsRate: null, debtAtEnd: 0 }), previous: undefined, currentExpenses: [], previousExpenses: [], categories })).toEqual([]);
  });
});

describe('toTransactionsCsv', () => {
  it('genera CSV con BOM, separador ; y montos con signo', () => {
    const accounts: Account[] = [{ id: 'main', name: 'Cuenta RUT', type: 'checking', initialBalance: 0, icon: 'credit-card', color: 'forest', sortOrder: 0, ...stamp }];
    const csv = toTransactionsCsv(
      [tx('income', 1_000_000, '2026-09-01', null, 'Sueldo'), tx('variable_expense', 2_500, '2026-09-02', 'delivery', 'Pizza; con "extra"')],
      [category('delivery', 'Delivery')],
      accounts,
    );
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual([
      'Fecha;Tipo;Categoría;Cuenta;Monto;Nota',
      '2026-09-01;Ingreso;;Cuenta RUT;1000000;Sueldo',
      '2026-09-02;Gasto variable;Delivery;Cuenta RUT;-2500;"Pizza; con ""extra"""',
      '',
    ]);
    expect(csvFileName('2026-09-30T10:00:00Z')).toBe('movimientos-2026-09-30.csv');
  });
});
