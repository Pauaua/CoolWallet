import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';

/** Opciones de recordatorio de respaldo (días; 0 = nunca). */
export const BACKUP_REMINDER_OPTIONS = [
  { value: 0, label: 'Nunca' },
  { value: 7, label: '7 días' },
  { value: 14, label: '14 días' },
  { value: 30, label: '30 días' },
] as const;

/** Días desde el último respaldo (`null` si nunca se respaldó). */
export function daysSinceBackup(lastBackupAt: string | null, now: Date): number | null {
  if (!lastBackupAt) return null;
  return Math.max(0, differenceInCalendarDays(now, parseISO(lastBackupAt)));
}

/**
 * Si corresponde recordar el respaldo: el recordatorio está activo y pasaron
 * `reminderDays` días desde el último respaldo (o desde que se empezó a usar la app).
 */
export function isBackupOverdue(lastBackupAt: string | null, startedAt: string | null, reminderDays: number, now: Date): boolean {
  if (reminderDays <= 0) return false;
  const reference = lastBackupAt ?? startedAt;
  if (!reference) return false;
  return differenceInCalendarDays(now, parseISO(reference)) >= reminderDays;
}

/**
 * Cuándo enviar la notificación del próximo recordatorio: `reminderDays` días
 * después del último respaldo, a las 10:00. Si ya pasó, mañana a las 10:00.
 * `null` si el recordatorio está desactivado.
 */
export function nextBackupReminderDate(lastBackupAt: string | null, startedAt: string | null, reminderDays: number, now: Date): Date | null {
  if (reminderDays <= 0) return null;
  const reference = parseISO(lastBackupAt ?? startedAt ?? now.toISOString());
  const at10 = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0, 0, 0);
  const due = at10(addDays(reference, reminderDays));
  return due > now ? due : at10(addDays(now, 1));
}
