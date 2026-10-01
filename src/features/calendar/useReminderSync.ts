import { useEffect, useMemo, useRef } from 'react';

import { nextBackupReminderDate } from '@/features/backup/backupReminder';
import { useDebtsSummary } from '@/features/debts/queries';
import { useFixedExpenses, useOccurrencesInRange } from '@/features/expenses/queries';
import { useSettings } from '@/features/settings/queries';
import { toIsoDate } from '@/lib/finance';
import { cancelAllReminders, replaceScheduledReminders, type LocalReminder } from '@/services/notifications';

import { buildCalendarEvents } from './calendarModel';
import { buildDueReminders, getReminderRange } from './reminderSchedule';

/**
 * Mantiene programadas las notificaciones locales (vencimientos de los
 * próximos 60 días y recordatorio de respaldo). Se reprograma solo cuando
 * cambia el conjunto de avisos.
 */
export function useReminderSync() {
  const settings = useSettings();
  const fixedExpenses = useFixedExpenses();
  const debts = useDebtsSummary();
  const today = toIsoDate(new Date());
  const range = useMemo(() => getReminderRange(new Date(`${today}T12:00:00`)), [today]);
  const occurrences = useOccurrencesInRange({ from: range.start, to: range.end });
  const lastSignature = useRef<string | null>(null);

  const reminders = useMemo<LocalReminder[] | null>(() => {
    if (!settings.data || !fixedExpenses.data || !debts.data || !occurrences.data) return null;
    if (!settings.data.notificationsEnabled) return [];
    const now = new Date();
    const events = buildCalendarEvents({
      range,
      fixedExpenses: fixedExpenses.data,
      occurrences: occurrences.data,
      debts: debts.data.active.map((view) => ({ id: view.debt.id, name: view.debt.name, finance: view.finance })),
      today,
    });
    const due = buildDueReminders(events, settings.data.reminderDaysBefore, now);
    const backupDate = nextBackupReminderDate(settings.data.lastBackupAt, settings.data.onboardingCompletedAt, settings.data.backupReminderDays, now);
    const backup: LocalReminder[] = backupDate
      ? [{ id: 'backup-reminder', date: backupDate, title: 'Respalda tus datos', body: 'Exporta un respaldo para no perder tu información si cambias de teléfono.' }]
      : [];
    return [...due, ...backup];
  }, [settings.data, fixedExpenses.data, debts.data, occurrences.data, range, today]);

  useEffect(() => {
    if (reminders === null) return;
    const signature = JSON.stringify(reminders.map((reminder) => [reminder.id, reminder.date.getTime(), reminder.title, reminder.body]));
    if (signature === lastSignature.current) return;
    lastSignature.current = signature;
    const task = reminders.length === 0 ? cancelAllReminders() : replaceScheduledReminders(reminders);
    task.catch((error: unknown) => {
      // Un fallo al programar avisos no debe romper la app; se reintenta en el próximo cambio.
      lastSignature.current = null;
      console.warn('No se pudieron programar los recordatorios', error);
    });
  }, [reminders]);
}
