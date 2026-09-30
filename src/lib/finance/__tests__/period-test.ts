import {
  clampDayToMonth,
  daysUntil,
  getDaysElapsed,
  getDaysRemaining,
  getFinancialPeriod,
  getPreviousPeriod,
  isDateInPeriod,
  parseIsoDate,
  toIsoDate,
} from '../period';

describe('toIsoDate / parseIsoDate', () => {
  it('ida y vuelta en hora local', () => {
    expect(toIsoDate(new Date(2026, 8, 30))).toBe('2026-09-30');
    expect(toIsoDate(parseIsoDate('2026-09-30'))).toBe('2026-09-30');
  });

  it('ignora la hora de un ISO completo', () => {
    expect(toIsoDate(parseIsoDate('2026-09-30T23:59:00.000Z'))).toBe('2026-09-30');
  });

  it('acepta Date y descarta la hora', () => {
    expect(parseIsoDate(new Date(2026, 8, 30, 18, 45))).toEqual(new Date(2026, 8, 30));
  });

  it('lanza error con fechas inválidas', () => {
    expect(() => parseIsoDate('no-es-fecha')).toThrow('Fecha inválida');
  });
});

describe('clampDayToMonth', () => {
  it('ajusta al largo del mes', () => {
    expect(clampDayToMonth(2026, 1, 31)).toBe(28);
    expect(clampDayToMonth(2028, 1, 31)).toBe(29);
    expect(clampDayToMonth(2026, 3, 31)).toBe(30);
    expect(clampDayToMonth(2026, 0, 0)).toBe(1);
  });
});

describe('getFinancialPeriod', () => {
  it('modo calendario: del 1 al último día', () => {
    expect(getFinancialPeriod('2026-09-15', 25, 'calendar')).toEqual({ start: '2026-09-01', end: '2026-09-30', daysInPeriod: 30 });
    expect(getFinancialPeriod('2028-02-10', 25, 'calendar')).toEqual({ start: '2028-02-01', end: '2028-02-29', daysInPeriod: 29 });
  });

  it('modo pago: desde el día de pago', () => {
    expect(getFinancialPeriod('2026-09-30', 25, 'payday')).toEqual({ start: '2026-09-25', end: '2026-10-24', daysInPeriod: 30 });
    expect(getFinancialPeriod('2026-09-25', 25, 'payday').start).toBe('2026-09-25');
  });

  it('modo pago: antes del día de pago pertenece al período anterior', () => {
    expect(getFinancialPeriod('2026-09-10', 25, 'payday')).toEqual({ start: '2026-08-25', end: '2026-09-24', daysInPeriod: 31 });
  });

  it('cruza el año', () => {
    expect(getFinancialPeriod('2026-01-05', 25, 'payday')).toEqual({ start: '2025-12-25', end: '2026-01-24', daysInPeriod: 31 });
  });

  it('día de pago 31 en meses cortos', () => {
    expect(getFinancialPeriod('2026-02-28', 31, 'payday')).toEqual({ start: '2026-02-28', end: '2026-03-30', daysInPeriod: 31 });
    expect(getFinancialPeriod('2026-02-15', 31, 'payday')).toEqual({ start: '2026-01-31', end: '2026-02-27', daysInPeriod: 28 });
  });

  it('día de pago 30 cuando el mes anterior es febrero', () => {
    expect(getFinancialPeriod('2026-03-01', 30, 'payday')).toEqual({ start: '2026-02-28', end: '2026-03-29', daysInPeriod: 30 });
  });

  it('día de pago 1 equivale al calendario', () => {
    expect(getFinancialPeriod('2026-09-15', 1, 'payday')).toEqual(getFinancialPeriod('2026-09-15', 1, 'calendar'));
  });

  it('acepta Date', () => {
    expect(getFinancialPeriod(new Date(2026, 8, 30), 1, 'calendar').start).toBe('2026-09-01');
  });
});

describe('getPreviousPeriod', () => {
  it('devuelve el período anterior', () => {
    const current = getFinancialPeriod('2026-09-30', 25, 'payday');
    expect(getPreviousPeriod(current, 25, 'payday')).toEqual({ start: '2026-08-25', end: '2026-09-24', daysInPeriod: 31 });
  });
});

describe('isDateInPeriod', () => {
  const period = { start: '2026-09-01', end: '2026-09-30', daysInPeriod: 30 };

  it('incluye los bordes', () => {
    expect(isDateInPeriod('2026-09-01', period)).toBe(true);
    expect(isDateInPeriod('2026-09-30T23:00:00Z', period)).toBe(true);
    expect(isDateInPeriod('2026-08-31', period)).toBe(false);
    expect(isDateInPeriod('2026-10-01', period)).toBe(false);
  });
});

describe('getDaysElapsed / getDaysRemaining', () => {
  const period = { start: '2026-09-01', end: '2026-09-30', daysInPeriod: 30 };

  it('cuentan el día de hoy', () => {
    expect(getDaysElapsed(period, '2026-09-01')).toBe(1);
    expect(getDaysRemaining(period, '2026-09-01')).toBe(30);
    expect(getDaysElapsed(period, '2026-09-30')).toBe(30);
    expect(getDaysRemaining(period, '2026-09-30')).toBe(1);
  });

  it('se limitan fuera del período', () => {
    expect(getDaysElapsed(period, '2026-08-31')).toBe(0);
    expect(getDaysRemaining(period, '2026-08-01')).toBe(30);
    expect(getDaysElapsed(period, '2026-10-05')).toBe(30);
    expect(getDaysRemaining(period, '2026-10-01')).toBe(0);
  });
});

describe('daysUntil', () => {
  it('cuenta días de calendario con signo', () => {
    expect(daysUntil('2026-10-02', '2026-09-30')).toBe(2);
    expect(daysUntil('2026-09-30', '2026-09-30')).toBe(0);
    expect(daysUntil('2026-09-28', new Date(2026, 8, 30, 23, 0))).toBe(-2);
  });
});
