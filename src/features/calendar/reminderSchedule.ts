import { addDays, parseISO } from 'date-fns';

import { formatCLP, toIsoDate, type IsoDate } from '@/lib/finance';

import type { CalendarEvent } from './calendarModel';

export type ScheduledReminder = {
  id: string;
  date: Date;
  title: string;
  body: string;
};

/** Hora a la que llegan los avisos de vencimiento. */
const REMINDER_HOUR = 9;
/** iOS permite 64 notificaciones programadas; se deja margen. */
export const MAX_SCHEDULED_REMINDERS = 60;
/** Días hacia adelante que se programan (se reprograma cada vez que cambian los datos). */
export const REMINDER_WINDOW_DAYS = 60;

/**
 * Avisos de vencimientos pendientes: `daysBefore` días antes, a las 9:00.
 * Solo fechas futuras, los más próximos primero y con tope para iOS.
 */
export function buildDueReminders(events: readonly CalendarEvent[], daysBefore: number, now: Date): ScheduledReminder[] {
  return events
    .filter((event) => event.status !== 'paid')
    .map((event) => {
      const due = parseISO(event.date);
      const fire = addDays(new Date(due.getFullYear(), due.getMonth(), due.getDate(), REMINDER_HOUR), -Math.max(0, daysBefore));
      const when = daysBefore === 1 ? 'mañana' : daysBefore === 0 ? 'hoy' : `en ${daysBefore} días`;
      return {
        id: `due-${event.key}`,
        date: fire,
        title: `${event.title} vence ${when}`,
        body: `${event.detail} · ${formatCLP(event.amount)}. Vence el ${event.date.split('-').reverse().join('-')}.`,
      };
    })
    .filter((reminder) => reminder.date > now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, MAX_SCHEDULED_REMINDERS);
}

/** Rango de fechas a revisar para programar avisos (desde hoy). */
export function getReminderRange(now: Date): { start: IsoDate; end: IsoDate; daysInPeriod: number } {
  return { start: toIsoDate(now), end: toIsoDate(addDays(now, REMINDER_WINDOW_DAYS)), daysInPeriod: REMINDER_WINDOW_DAYS + 1 };
}
