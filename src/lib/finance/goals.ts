import { differenceInCalendarMonths } from 'date-fns';

import { ceilMoney } from './money';
import { parseIsoDate, type IsoDate } from './period';

export type MonthlySavingPlan = {
  /** Cuánto ahorrar cada mes (redondeado hacia arriba para no quedar corto). */
  monthlyAmount: number;
  /** Lo que falta para la meta. */
  remaining: number;
  /** Meses disponibles hasta la fecha objetivo (mínimo 1 si aún no llega). */
  monthsRemaining: number;
  /** La fecha objetivo ya pasó (o es hoy) y la meta no está completa. */
  isOverdue: boolean;
};

/**
 * Cuánto ahorrar al mes para llegar a la meta en la fecha objetivo.
 * Los meses se cuentan por calendario (de septiembre a diciembre = 3).
 * Si la fecha ya pasó, todo lo que falta se considera para este mes.
 */
export function calcMonthlySavingNeeded(
  target: number,
  saved: number,
  targetDate: IsoDate,
  today: IsoDate | Date,
): MonthlySavingPlan {
  const remaining = Math.max(0, target - saved);
  if (remaining === 0) return { monthlyAmount: 0, remaining: 0, monthsRemaining: 0, isOverdue: false };

  const due = parseIsoDate(targetDate);
  const now = parseIsoDate(today);
  if (due <= now) return { monthlyAmount: ceilMoney(remaining), remaining, monthsRemaining: 0, isOverdue: true };

  const monthsRemaining = Math.max(1, differenceInCalendarMonths(due, now));
  return { monthlyAmount: ceilMoney(remaining / monthsRemaining), remaining, monthsRemaining, isOverdue: false };
}

export type GoalProgress = {
  /** % de avance (0–100). */
  percentage: number;
  remaining: number;
  isComplete: boolean;
};

/** Avance de una meta de ahorro. */
export function calcGoalProgress(saved: number, target: number): GoalProgress {
  if (target <= 0) return { percentage: 0, remaining: 0, isComplete: false };
  const percentage = Math.min(100, Math.max(0, (saved / target) * 100));
  const remaining = Math.max(0, target - saved);
  return { percentage, remaining, isComplete: remaining === 0 };
}
