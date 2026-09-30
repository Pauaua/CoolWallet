import { apply503020, calcBudgetRemaining, calcBudgetUsage, getBudgetAlertLevel } from '../budget';
import { calcGoalProgress, calcMonthlySavingNeeded } from '../goals';

describe('apply503020', () => {
  it('reparte 50/30/20', () => {
    expect(apply503020(1_000_000)).toEqual({ needs: 500_000, wants: 300_000, savings: 200_000 });
  });

  it('la suma siempre es el ingreso', () => {
    const result = apply503020(1_000_001);
    expect(result).toEqual({ needs: 500_001, wants: 300_000, savings: 200_000 });
    expect(result.needs + result.wants + result.savings).toBe(1_000_001);
  });

  it('sin ingreso todo es 0', () => {
    expect(apply503020(0)).toEqual({ needs: 0, wants: 0, savings: 0 });
    expect(apply503020(-10)).toEqual({ needs: 0, wants: 0, savings: 0 });
  });
});

describe('presupuestos', () => {
  it('uso del presupuesto', () => {
    expect(calcBudgetUsage(80_000, 100_000)).toBe(80);
    expect(calcBudgetUsage(0, 100_000)).toBe(0);
    expect(calcBudgetUsage(50, 0)).toBeNull();
  });

  it('restante (negativo si se excede)', () => {
    expect(calcBudgetRemaining(30_000, 100_000)).toBe(70_000);
    expect(calcBudgetRemaining(120_000, 100_000)).toBe(-20_000);
  });

  it('niveles de alerta', () => {
    expect(getBudgetAlertLevel(null)).toBe('none');
    expect(getBudgetAlertLevel(Number.NaN)).toBe('none');
    expect(getBudgetAlertLevel(0)).toBe('ok');
    expect(getBudgetAlertLevel(79.99)).toBe('ok');
    expect(getBudgetAlertLevel(80)).toBe('warning');
    expect(getBudgetAlertLevel(99.9)).toBe('warning');
    expect(getBudgetAlertLevel(100)).toBe('exceeded');
    expect(getBudgetAlertLevel(250)).toBe('exceeded');
  });
});

describe('calcMonthlySavingNeeded', () => {
  const today = '2026-09-30';

  it('divide lo que falta por los meses restantes', () => {
    expect(calcMonthlySavingNeeded(1_000_000, 100_000, '2026-12-31', today)).toEqual({
      monthlyAmount: 300_000,
      remaining: 900_000,
      monthsRemaining: 3,
      isOverdue: false,
    });
  });

  it('redondea hacia arriba para no quedar corto', () => {
    expect(calcMonthlySavingNeeded(1_000_000, 0, '2026-12-31', today).monthlyAmount).toBe(333_334);
  });

  it('al menos 1 mes si la fecha es este mes o el próximo', () => {
    expect(calcMonthlySavingNeeded(100_000, 0, '2026-10-01', today).monthsRemaining).toBe(1);
    expect(calcMonthlySavingNeeded(100_000, 0, '2026-10-01', '2026-10-01').isOverdue).toBe(true);
    expect(calcMonthlySavingNeeded(100_000, 0, '2026-09-30', new Date(2026, 8, 15)).monthsRemaining).toBe(1);
  });

  it('fecha pasada: todo lo que falta, marcado como atrasado', () => {
    expect(calcMonthlySavingNeeded(100_000, 40_000, '2026-08-01', today)).toEqual({
      monthlyAmount: 60_000,
      remaining: 60_000,
      monthsRemaining: 0,
      isOverdue: true,
    });
  });

  it('meta cumplida: nada que ahorrar', () => {
    expect(calcMonthlySavingNeeded(100_000, 150_000, '2026-08-01', today)).toEqual({
      monthlyAmount: 0,
      remaining: 0,
      monthsRemaining: 0,
      isOverdue: false,
    });
  });
});

describe('calcGoalProgress', () => {
  it('calcula el avance', () => {
    expect(calcGoalProgress(250_000, 1_000_000)).toEqual({ percentage: 25, remaining: 750_000, isComplete: false });
  });

  it('se limita a 0–100', () => {
    expect(calcGoalProgress(2_000_000, 1_000_000)).toEqual({ percentage: 100, remaining: 0, isComplete: true });
    expect(calcGoalProgress(-10, 1_000)).toEqual({ percentage: 0, remaining: 1_010, isComplete: false });
  });

  it('meta sin monto', () => {
    expect(calcGoalProgress(100, 0)).toEqual({ percentage: 0, remaining: 0, isComplete: false });
  });
});
