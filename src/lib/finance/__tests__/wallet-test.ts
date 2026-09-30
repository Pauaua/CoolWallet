import type { FinancialPeriod } from '../period';
import type { FinanceTransaction } from '../types';
import {
  calcAccountBalance,
  calcAccountBalances,
  calcAdjustmentAmount,
  calcPeriodIncomeBase,
  getSalaryDate,
  isSalaryPending,
  projectClosingBalance,
  signedAmount,
  summarizePeriodFlow,
} from '../wallet';

const tx = (type: FinanceTransaction['type'], amount: number, accountId: string | null = 'main'): FinanceTransaction & { accountId: string | null } => ({
  type,
  amount,
  date: '2026-09-10',
  categoryId: null,
  accountId,
});

describe('signedAmount', () => {
  it('ingresos y ajustes suman; gastos y deudas restan', () => {
    expect(signedAmount(tx('income', 100))).toBe(100);
    expect(signedAmount(tx('adjustment', -30))).toBe(-30);
    expect(signedAmount(tx('fixed_expense', 50))).toBe(-50);
    expect(signedAmount(tx('ant_expense', 5))).toBe(-5);
    expect(signedAmount(tx('debt_payment', 20))).toBe(-20);
  });
});

describe('calcAccountBalance / calcAccountBalances', () => {
  const movements = [tx('income', 1_000_000), tx('ant_expense', 3_000), tx('debt_payment', 50_000), tx('adjustment', -7_000), tx('ant_expense', 2_000, 'cash')];

  it('saldo inicial + movimientos', () => {
    expect(calcAccountBalance(100_000, movements.slice(0, 4))).toBe(1_040_000);
    expect(calcAccountBalance(0, [])).toBe(0);
  });

  it('agrupa por cuenta e ignora cuentas desconocidas o vacías', () => {
    const balances = calcAccountBalances(
      [
        { id: 'main', initialBalance: 100_000 },
        { id: 'cash', initialBalance: 10_000 },
      ],
      [...movements, tx('income', 999, 'deleted'), tx('income', 1, null)],
    );
    expect(balances).toEqual({ main: 1_040_000, cash: 8_000 });
  });

  it('una tarjeta con gastos queda negativa', () => {
    expect(calcAccountBalances([{ id: 'card', initialBalance: 0 }], [tx('fixed_expense', 30_000, 'card')])).toEqual({ card: -30_000 });
  });
});

describe('calcAdjustmentAmount', () => {
  it('diferencia con signo entre el saldo real y el registrado', () => {
    expect(calcAdjustmentAmount(500_000, 480_000)).toBe(-20_000);
    expect(calcAdjustmentAmount(-10_000, 5_000)).toBe(15_000);
    expect(calcAdjustmentAmount(100, 100)).toBe(0);
  });
});

describe('summarizePeriodFlow', () => {
  it('separa ingresos, gastos, deudas y ajustes', () => {
    expect(summarizePeriodFlow([tx('income', 1_000_000), tx('fixed_expense', 300_000), tx('ant_expense', 20_000), tx('debt_payment', 80_000), tx('adjustment', 5_000)])).toEqual({
      income: 1_000_000,
      expenses: 320_000,
      debtPayments: 80_000,
      adjustments: 5_000,
      net: 605_000,
    });
  });

  it('sin movimientos todo es 0', () => {
    expect(summarizePeriodFlow([])).toEqual({ income: 0, expenses: 0, debtPayments: 0, adjustments: 0, net: 0 });
  });
});

describe('sueldo del período', () => {
  const paydayPeriod: FinancialPeriod = { start: '2026-09-25', end: '2026-10-24', daysInPeriod: 30 };
  const calendarPeriod: FinancialPeriod = { start: '2026-02-01', end: '2026-02-28', daysInPeriod: 28 };

  it('fecha esperada del sueldo', () => {
    expect(getSalaryDate(paydayPeriod, 25, 'payday')).toBe('2026-09-25');
    expect(getSalaryDate(calendarPeriod, 25, 'calendar')).toBe('2026-02-25');
    expect(getSalaryDate(calendarPeriod, 31, 'calendar')).toBe('2026-02-28');
  });

  it('pendiente desde la fecha de pago hasta que se registra', () => {
    expect(isSalaryPending('2026-02-25', '2026-02-24', false)).toBe(false);
    expect(isSalaryPending('2026-02-25', '2026-02-25', false)).toBe(true);
    expect(isSalaryPending('2026-02-25', new Date(2026, 1, 27), false)).toBe(true);
    expect(isSalaryPending('2026-02-25', '2026-02-27', true)).toBe(false);
  });

  it('ingreso de referencia suma el sueldo esperado si falta', () => {
    expect(calcPeriodIncomeBase(50_000, 900_000, false)).toBe(950_000);
    expect(calcPeriodIncomeBase(950_000, 900_000, true)).toBe(950_000);
    expect(calcPeriodIncomeBase(0, -10, false)).toBe(0);
  });
});

describe('projectClosingBalance', () => {
  it('descuenta el ritmo de gasto de los días que faltan', () => {
    // Promedio 10.000/día, faltan 20 días después de hoy.
    expect(projectClosingBalance(500_000, 0, 100_000, 10, 30)).toBe(300_000);
  });

  it('suma los ingresos pendientes', () => {
    expect(projectClosingBalance(100_000, 900_000, 0, 1, 30)).toBe(1_000_000);
  });

  it('el último día no proyecta más gasto', () => {
    expect(projectClosingBalance(50_000, 0, 300_000, 30, 30)).toBe(50_000);
  });

  it('sin días transcurridos no hay ritmo que proyectar', () => {
    expect(projectClosingBalance(50_000, 0, 0, 0, 30)).toBe(50_000);
  });

  it('puede proyectar saldo negativo', () => {
    expect(projectClosingBalance(10_000, 0, 60_000, 3, 30)).toBe(-530_000);
  });
});
