import type { FinanceDebt } from '@/lib/finance';
import type { FixedExpense, FixedExpenseOccurrence } from '@/types/models';

import { buildCalendarEvents, buildMonthGrid, getMonthRange, groupEventsByDate } from '../calendarModel';
import { buildDueReminders, getReminderRange, MAX_SCHEDULED_REMINDERS } from '../reminderSchedule';

const stamp = { createdAt: '', updatedAt: '', deletedAt: null };
const rent: FixedExpense = {
  id: 'rent',
  name: 'Arriendo',
  amount: 450_000,
  categoryId: null,
  accountId: null,
  dueDay: 5,
  frequency: 'monthly',
  startDate: '2026-01-01',
  endDate: null,
  active: true,
  note: null,
  ...stamp,
};
const internet: FixedExpense = { ...rent, id: 'net', name: 'Internet', amount: 25_990, dueDay: 28 };
const paidRent: FixedExpenseOccurrence = { id: 'o1', fixedExpenseId: 'rent', dueDate: '2026-09-05', amount: 450_000, status: 'paid', transactionId: 't', paidAt: '', ...stamp };
const loan: FinanceDebt = { kind: 'installment', principal: 1_000_000, paidAmount: 0, installmentsTotal: 12, installmentsPaid: 3, installmentAmount: 94_560, firstPaymentDate: '2026-06-10' };
const friend: FinanceDebt = { kind: 'pending', principal: 50_000, paidAmount: 10_000, dueDate: '2026-09-20' };

describe('getMonthRange / buildMonthGrid', () => {
  it('rango del mes', () => {
    expect(getMonthRange(2026, 8)).toEqual({ start: '2026-09-01', end: '2026-09-30', daysInPeriod: 30 });
    expect(getMonthRange(2028, 1).end).toBe('2028-02-29');
  });

  it('semanas de lunes a domingo con relleno', () => {
    const grid = buildMonthGrid(2026, 8); // septiembre 2026 parte un martes
    expect(grid[0]).toEqual([null, '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06']);
    expect(grid.at(-1)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', null, null, null, null]);
    expect(grid.every((week) => week.length === 7)).toBe(true);
  });
});

describe('buildCalendarEvents', () => {
  const events = buildCalendarEvents({
    range: getMonthRange(2026, 8),
    fixedExpenses: [rent, internet],
    occurrences: [paidRent],
    debts: [
      { id: 'loan', name: 'Crédito', finance: loan },
      { id: 'friend', name: 'Juan', finance: friend },
    ],
    today: '2026-09-15',
  });

  it('gastos fijos y deudas con estado', () => {
    expect(events.map((event) => [event.date, event.title, event.status, event.amount])).toEqual([
      ['2026-09-05', 'Arriendo', 'paid', 450_000],
      ['2026-09-10', 'Crédito', 'overdue', 94_560],
      ['2026-09-20', 'Juan', 'pending', 40_000],
      ['2026-09-28', 'Internet', 'pending', 25_990],
    ]);
    expect(events.find((event) => event.refId === 'loan')?.detail).toBe('Cuota 4 de 12');
  });

  it('agrupa por fecha', () => {
    expect(groupEventsByDate(events).get('2026-09-05')?.map((event) => event.refId)).toEqual(['rent']);
  });

  it('deudas pendientes ya pagadas o fuera del rango', () => {
    const range = getMonthRange(2026, 8);
    const paidFriend = buildCalendarEvents({ range, fixedExpenses: [], occurrences: [], debts: [{ id: 'f', name: 'Juan', finance: { ...friend, paidAmount: 50_000 } }], today: '2026-09-25' });
    expect(paidFriend[0]?.status).toBe('paid');
    const outside = buildCalendarEvents({ range, fixedExpenses: [], occurrences: [], debts: [{ id: 'f', name: 'Juan', finance: { ...friend, dueDate: '2026-11-01' } }], today: '2026-09-25' });
    expect(outside).toEqual([]);
    const noDate = buildCalendarEvents({ range, fixedExpenses: [], occurrences: [], debts: [{ id: 'f', name: 'Juan', finance: { ...friend, dueDate: null } }], today: '2026-09-25' });
    expect(noDate).toEqual([]);
  });
});

describe('buildDueReminders', () => {
  const events = buildCalendarEvents({
    range: getReminderRange(new Date(2026, 8, 15, 12)),
    fixedExpenses: [rent, internet],
    occurrences: [],
    debts: [{ id: 'loan', name: 'Crédito', finance: loan }],
    today: '2026-09-15',
  });

  it('un día antes a las 9:00, solo futuros y pendientes, ordenados', () => {
    const reminders = buildDueReminders(events, 1, new Date(2026, 8, 15, 12));
    expect(reminders[0]).toEqual({
      id: 'due-fixed|net|2026-09-28',
      date: new Date(2026, 8, 27, 9),
      title: 'Internet vence mañana',
      body: 'Gasto fijo · $25.990. Vence el 28-09-2026.',
    });
    expect(reminders.every((reminder) => reminder.date > new Date(2026, 8, 15, 12))).toBe(true);
  });

  it('dos días antes', () => {
    expect(buildDueReminders(events, 2, new Date(2026, 8, 15, 12))[0]).toMatchObject({ date: new Date(2026, 8, 26, 9), title: 'Internet vence en 2 días' });
  });

  it('respeta el tope de notificaciones', () => {
    const many = Array.from({ length: 100 }, (_, index) => ({ ...events[0]!, key: `k${index}`, date: '2026-12-01', status: 'pending' as const }));
    expect(buildDueReminders(many, 1, new Date(2026, 8, 15))).toHaveLength(MAX_SCHEDULED_REMINDERS);
  });
});
