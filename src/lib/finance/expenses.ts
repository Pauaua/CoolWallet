import { addMonths, differenceInCalendarMonths } from 'date-fns';

import { percentageOf, roundMoney, sumAmounts } from './money';
import { dateWithDay, parseIsoDate, toIsoDate, type FinancialPeriod, type IsoDate } from './period';

export type ExpenseFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual';

/** Veces por año de cada frecuencia. */
export const OCCURRENCES_PER_YEAR: Record<ExpenseFrequency, number> = {
  daily: 365,
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  bimonthly: 6,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
};

/** Costo anual de un gasto que se repite (ej.: café diario de $2.500 → $912.500). */
export function annualizeExpense(amount: number, frequency: ExpenseFrequency): number {
  return roundMoney(amount * OCCURRENCES_PER_YEAR[frequency]);
}

/** Equivalente mensual de un gasto que se repite (ej.: $120.000 anual → $10.000). */
export function toMonthlyAmount(amount: number, frequency: ExpenseFrequency): number {
  return roundMoney((amount * OCCURRENCES_PER_YEAR[frequency]) / 12);
}

export type AntExpensesImpact = {
  /** Total de gastos hormiga registrados. */
  total: number;
  /** % del ingreso mensual; `null` si no hay ingreso. */
  percentageOfIncome: number | null;
  /** Total proyectado del mes al ritmo actual. */
  projectedMonthly: number;
  /** Proyección anual (mensual × 12). */
  projectedAnnual: number;
};

/**
 * Impacto de los gastos hormiga del período.
 * Si se indica el avance del período, proyecta el mes completo al ritmo actual;
 * si no, toma el total como el gasto del mes.
 */
export function calcAntExpensesImpact(
  antExpenses: readonly { amount: number }[],
  income: number,
  progress?: { daysElapsed: number; daysInPeriod: number },
): AntExpensesImpact {
  const total = sumAmounts(antExpenses.map((expense) => expense.amount));
  const monthly =
    progress && progress.daysElapsed > 0 && progress.daysElapsed < progress.daysInPeriod
      ? (total / progress.daysElapsed) * progress.daysInPeriod
      : total;
  return {
    total,
    percentageOfIncome: percentageOf(total, income),
    projectedMonthly: roundMoney(monthly),
    projectedAnnual: roundMoney(monthly * 12),
  };
}

export type RecurringFrequency = 'monthly' | 'bimonthly' | 'annual';

const MONTHS_BETWEEN: Record<RecurringFrequency, number> = { monthly: 1, bimonthly: 2, annual: 12 };

/** Datos mínimos de un gasto fijo para generar sus vencimientos. */
export type RecurringExpenseDefinition = {
  id: string;
  amount: number;
  /** Día de vencimiento (1–31; se ajusta en meses cortos). */
  dueDay: number;
  frequency: RecurringFrequency;
  /** Desde cuándo rige: el primer vencimiento es el primero en o después de esta fecha. */
  startDate: IsoDate;
  /** Último día en que rige (opcional). */
  endDate?: IsoDate | null;
  active: boolean;
};

export type RecurringExpenseOccurrence = {
  fixedExpenseId: string;
  dueDate: IsoDate;
  amount: number;
};

/**
 * Vencimientos de los gastos fijos que caen dentro del período.
 * Los bimestrales y anuales se repiten cada 2 o 12 meses contados desde el
 * mes del primer vencimiento. Ordenados por fecha.
 */
export function generateRecurringExpenses(
  fixedExpenses: readonly RecurringExpenseDefinition[],
  period: FinancialPeriod,
): RecurringExpenseOccurrence[] {
  const periodStart = parseIsoDate(period.start);
  const periodEnd = parseIsoDate(period.end);
  const occurrences: RecurringExpenseOccurrence[] = [];

  for (const expense of fixedExpenses) {
    if (!expense.active) continue;
    const startDate = parseIsoDate(expense.startDate);
    const endDate = expense.endDate ? parseIsoDate(expense.endDate) : null;
    const firstDue = firstDueOnOrAfter(startDate, expense.dueDay);
    const step = MONTHS_BETWEEN[expense.frequency];

    // Un período dura como máximo ~1 mes, pero se recorren todos los meses que toca.
    const months = differenceInCalendarMonths(periodEnd, periodStart);
    for (let offset = 0; offset <= months; offset += 1) {
      const due = dateWithDay(addMonths(dateWithDay(periodStart, 1), offset), expense.dueDay);
      if (due < periodStart || due > periodEnd || due < firstDue) continue;
      if (endDate && due > endDate) continue;
      if (differenceInCalendarMonths(due, firstDue) % step !== 0) continue;
      occurrences.push({ fixedExpenseId: expense.id, dueDate: toIsoDate(due), amount: expense.amount });
    }
  }

  return occurrences.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function firstDueOnOrAfter(date: Date, dueDay: number): Date {
  const sameMonth = dateWithDay(date, dueDay);
  return sameMonth >= date ? sameMonth : dateWithDay(addMonths(dateWithDay(date, 1), 1), dueDay);
}
