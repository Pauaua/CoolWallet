import { daysSinceBackup, isBackupOverdue, nextBackupReminderDate } from '../backupReminder';

const now = new Date(2026, 8, 30, 12, 0);

describe('recordatorio de respaldo', () => {
  it('días desde el último respaldo', () => {
    expect(daysSinceBackup(null, now)).toBeNull();
    expect(daysSinceBackup(new Date(2026, 8, 16, 9).toISOString(), now)).toBe(14);
  });

  it('vencido según el último respaldo o el inicio de uso', () => {
    expect(isBackupOverdue(new Date(2026, 8, 16, 9).toISOString(), null, 14, now)).toBe(true);
    expect(isBackupOverdue(new Date(2026, 8, 20, 9).toISOString(), null, 14, now)).toBe(false);
    expect(isBackupOverdue(null, new Date(2026, 8, 1).toISOString(), 14, now)).toBe(true);
    expect(isBackupOverdue(null, null, 14, now)).toBe(false);
    expect(isBackupOverdue(null, new Date(2026, 0, 1).toISOString(), 0, now)).toBe(false);
  });

  it('próxima notificación a las 10:00', () => {
    expect(nextBackupReminderDate(new Date(2026, 8, 25, 18).toISOString(), null, 14, now)).toEqual(new Date(2026, 9, 9, 10, 0));
    // Atrasado: mañana a las 10:00.
    expect(nextBackupReminderDate(new Date(2026, 8, 1).toISOString(), null, 14, now)).toEqual(new Date(2026, 9, 1, 10, 0));
    expect(nextBackupReminderDate(null, null, 7, now)).toEqual(new Date(2026, 9, 7, 10, 0));
    expect(nextBackupReminderDate(null, null, 0, now)).toBeNull();
  });
});
