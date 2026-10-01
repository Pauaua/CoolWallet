import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { withoutAutoLock } from '@/store/sessionStore';

/** Canal de Android para los recordatorios. */
const CHANNEL_ID = 'recordatorios';

export type LocalReminder = { id: string; date: Date; title: string; body: string };

/** Cómo se muestran las notificaciones con la app abierta. Llamar una vez al iniciar. */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Recordatorios',
    description: 'Vencimientos de gastos fijos, cuotas y respaldo',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Pide permiso para notificaciones locales. `true` si quedaron permitidas. */
export async function ensureNotificationPermission(): Promise<boolean> {
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await withoutAutoLock(() => Notifications.requestPermissionsAsync());
  return requested.granted;
}

/** Reemplaza todos los recordatorios programados por `reminders` (solo notificaciones locales). */
export async function replaceScheduledReminders(reminders: readonly LocalReminder[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (reminders.length === 0) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  await ensureAndroidChannel();
  for (const reminder of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: { title: reminder.title, body: reminder.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date, channelId: CHANNEL_ID },
    });
  }
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
