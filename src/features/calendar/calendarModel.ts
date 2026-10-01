import { addDays, endOfMonth, getISODay, startOfMonth } from 'date-fns';

import {
  calcRemainingBalance,
  daysUntil,
  generateRecurringExpenses,
  getInstallmentAmount,
  listInstallmentDueDates,
  toIsoDate,
  type FinanceDebt,
  type FinancialPeriod,
  type IsoDate,
} from '@/lib/finance';
import type { FixedExpense, FixedExpenseOccurrence } from '@/types/models';

/** Mes visible del calendario como período (del 1 al último día). */
export function getMonthRange(year: number, monthIndex: number): FinancialPeriod {
  const start = startOfMonth(new Date(year, monthIndex, 1));
  const end = endOfMonth(start);
  return { start: toIsoDate(start), end: toIsoDate(end), daysInPeriod: end.getDate() };
}

/**
 * Grilla del mes en semanas de lunes a domingo. Los días de relleno
 * (de otros meses) son `null`.
 */
export function buildMonthGrid(year: number, monthIndex: number): (IsoDate | null)[][] {
  const first = new Date(year, monthIndex, 1);
  const leading = getISODay(first) - 1;
  const days = endOfMonth(first).getDate();
  const cells: (IsoDate | null)[] = [...Array<null>(leading).fill(null)];
  for (let day = 0; day < days; day += 1) cells.push(toIsoDate(addDays(first, day)));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (IsoDate | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

export type CalendarEventStatus = 'paid' | 'pending' | 'overdue';

export type CalendarEvent = {
  key: string;
  date: IsoDate;
  kind: 'fixed' | 'debt';
  /** id del gasto fijo o de la deuda. */
  refId: string;
  title: string;
  detail: string;
  amount: number;
  status: CalendarEventStatus;
};

export type CalendarDebt = { id: string; name: string; finance: FinanceDebt };

/**
 * Vencimientos de un rango: gastos fijos (según su frecuencia) y deudas
 * (cada cuota, o la fecha límite de las deudas sin cuotas).
 */
export function buildCalendarEvents(input: {
  range: FinancialPeriod;
  fixedExpenses: readonly FixedExpense[];
  occurrences: readonly FixedExpenseOccurrence[];
  debts: readonly CalendarDebt[];
  today: IsoDate;
}): CalendarEvent[] {
  const paidKeys = new Set(input.occurrences.filter((item) => item.status === 'paid').map((item) => `${item.fixedExpenseId}|${item.dueDate}`));
  const statusOf = (date: IsoDate, isPaid: boolean): CalendarEventStatus => (isPaid ? 'paid' : daysUntil(date, input.today) < 0 ? 'overdue' : 'pending');
  const fixedById = new Map(input.fixedExpenses.map((expense) => [expense.id, expense]));

  const fixedEvents = generateRecurringExpenses(input.fixedExpenses, input.range).map((item) => {
    const isPaid = paidKeys.has(`${item.fixedExpenseId}|${item.dueDate}`);
    return {
      key: `fixed|${item.fixedExpenseId}|${item.dueDate}`,
      date: item.dueDate,
      kind: 'fixed' as const,
      refId: item.fixedExpenseId,
      title: fixedById.get(item.fixedExpenseId)?.name ?? 'Gasto fijo',
      detail: 'Gasto fijo',
      amount: item.amount,
      status: statusOf(item.dueDate, isPaid),
    };
  });

  const debtEvents = input.debts.flatMap((debt) => {
    if (debt.finance.kind === 'installment') {
      return listInstallmentDueDates(debt.finance, input.range.start, input.range.end).map((due) => ({
        key: `debt|${debt.id}|${due.date}`,
        date: due.date,
        kind: 'debt' as const,
        refId: debt.id,
        title: debt.name,
        detail: `Cuota ${due.number} de ${debt.finance.installmentsTotal ?? 0}`,
        amount: getInstallmentAmount(debt.finance),
        status: statusOf(due.date, due.isPaid),
      }));
    }
    const dueDate = debt.finance.dueDate;
    if (!dueDate || dueDate < input.range.start || dueDate > input.range.end) return [];
    const remaining = calcRemainingBalance(debt.finance);
    return [
      {
        key: `debt|${debt.id}|${dueDate}`,
        date: dueDate,
        kind: 'debt' as const,
        refId: debt.id,
        title: debt.name,
        detail: 'Fecha límite',
        amount: remaining,
        status: statusOf(dueDate, remaining <= 0),
      },
    ];
  });

  return [...fixedEvents, ...debtEvents].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

/** Eventos agrupados por fecha. */
export function groupEventsByDate(events: readonly CalendarEvent[]): Map<IsoDate, CalendarEvent[]> {
  const map = new Map<IsoDate, CalendarEvent[]>();
  for (const event of events) map.set(event.date, [...(map.get(event.date) ?? []), event]);
  return map;
}
