import type { Account, Transaction } from '@/types/models';

import { buildWalletSummary } from '../walletSummary';

const stamp = { createdAt: '', updatedAt: '', deletedAt: null };

const accounts: Account[] = [
  { id: 'main', name: 'Cuenta corriente', type: 'checking', initialBalance: 200_000, icon: 'credit-card', color: 'forest', sortOrder: 0, ...stamp },
  { id: 'cash', name: 'Efectivo', type: 'cash', initialBalance: 20_000, icon: 'dollar-sign', color: 'emerald', sortOrder: 1, ...stamp },
];

let counter = 0;
function tx(partial: Partial<Transaction> & Pick<Transaction, 'type' | 'amount' | 'date'>): Transaction {
  counter += 1;
  return { id: `t${counter}`, accountId: 'main', categoryId: null, note: null, fixedExpenseId: null, debtId: null, isSalary: false, ...stamp, ...partial };
}

const base = { accounts, payDay: 25, periodMode: 'payday' as const, expectedSalary: 900_000, pendingFixedExpenses: 0 };

describe('buildWalletSummary', () => {
  it('antes de registrar el sueldo: pendiente e incluido en el ingreso de referencia', () => {
    const summary = buildWalletSummary({
      ...base,
      today: '2026-09-30',
      transactions: [tx({ type: 'variable_expense', amount: 60_000, date: '2026-09-27' }), tx({ type: 'income', amount: 500_000, date: '2026-09-01', isSalary: true })],
    });
    expect(summary.period).toEqual({ start: '2026-09-25', end: '2026-10-24', daysInPeriod: 30 });
    // El sueldo del 1 de septiembre pertenece al período anterior.
    expect(summary.salaryRegistered).toBe(false);
    expect(summary.salaryPending).toBe(true);
    expect(summary.available).toBe(200_000 + 500_000 - 60_000 + 20_000);
    expect(summary.pendingIncome).toBe(900_000);
    expect(summary.incomeBase).toBe(900_000);
    expect(summary.spent).toBe(60_000);
    expect(summary.spentPercentage).toBeCloseTo(6.67, 2);
    expect(summary.daysElapsed).toBe(6);
    expect(summary.daysRemaining).toBe(25);
    expect(summary.dailyAverage).toBe(10_000);
    // (660.000 + 900.000) / 25 días
    expect(summary.safeDailySpend).toBe(62_400);
    // 660.000 + 900.000 − 10.000 × 24
    expect(summary.projectedClosingBalance).toBe(1_320_000);
  });

  it('con el sueldo registrado deja de estar pendiente', () => {
    const summary = buildWalletSummary({
      ...base,
      today: '2026-09-30',
      transactions: [tx({ type: 'income', amount: 880_000, date: '2026-09-25', isSalary: true }), tx({ type: 'debt_payment', amount: 100_000, date: '2026-09-26' })],
    });
    expect(summary.salaryPending).toBe(false);
    expect(summary.pendingIncome).toBe(0);
    expect(summary.incomeBase).toBe(880_000);
    expect(summary.flow).toMatchObject({ income: 880_000, debtPayments: 100_000 });
    expect(summary.accounts.find((account) => account.id === 'main')?.balance).toBe(980_000);
  });

  it('modo calendario: el sueldo se pide recién desde el día de pago', () => {
    const early = buildWalletSummary({ ...base, periodMode: 'calendar', today: '2026-09-10', transactions: [] });
    expect(early.salaryDate).toBe('2026-09-25');
    expect(early.salaryPending).toBe(false);
    // Igual cuenta como ingreso esperado del mes.
    expect(early.pendingIncome).toBe(900_000);
    expect(buildWalletSummary({ ...base, periodMode: 'calendar', today: '2026-09-26', transactions: [] }).salaryPending).toBe(true);
  });

  it('sin sueldo configurado no pregunta ni suma ingreso esperado', () => {
    const summary = buildWalletSummary({ ...base, expectedSalary: 0, today: '2026-09-30', transactions: [] });
    expect(summary.salaryPending).toBe(false);
    expect(summary.pendingIncome).toBe(0);
    expect(summary.spentPercentage).toBeNull();
  });

  it('los gastos fijos no inflan el ritmo diario; los pendientes se descuentan', () => {
    const summary = buildWalletSummary({
      ...base,
      pendingFixedExpenses: 50_000,
      today: '2026-09-30',
      transactions: [
        tx({ type: 'income', amount: 900_000, date: '2026-09-25', isSalary: true }),
        tx({ type: 'fixed_expense', amount: 450_000, date: '2026-09-25' }),
        tx({ type: 'variable_expense', amount: 30_000, date: '2026-09-28' }),
      ],
    });
    expect(summary.spent).toBe(480_000);
    expect(summary.variableSpent).toBe(30_000);
    expect(summary.dailyAverage).toBe(5_000);
    // disponible 200.000 + 900.000 − 450.000 − 30.000 + 20.000 = 640.000; libre = 640.000 − 50.000
    expect(summary.freeToSpend).toBe(590_000);
    expect(summary.safeDailySpend).toBe(23_600);
    // 640.000 − 50.000 − 5.000 × 24
    expect(summary.projectedClosingBalance).toBe(470_000);
  });

  it('sin cuentas el disponible es 0', () => {
    expect(buildWalletSummary({ ...base, accounts: [], today: '2026-09-30', transactions: [] }).available).toBe(0);
  });
});
