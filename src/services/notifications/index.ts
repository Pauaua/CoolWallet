import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { withoutAutoLock } from '@/store/sessionStore';

type NotificationsModule = typeof import('expo-notifications');

/** Canal de Android para los recordatorios. */
const CHANNEL_ID = 'recordatorios';

export type LocalReminder = { id: string; date: Date; title: string; body: string };

/**
 * Expo Go en Android lanza un error apenas se importa `expo-notifications`
 * (desde el SDK 53). Ahí las notificaciones no están disponibles: se necesita
 * un build propio. En iOS con Expo Go y en builds propios sí funcionan.
 */
export const notificationsSupported = !(Platform.OS === 'android' && isRunningInExpoGo());

let modulePromise: Promise<NotificationsModule> | null = null;

/** Carga el módulo solo donde está soportado (importarlo en Expo Go Android rompe la app). */
function loadNotifications(): Promise<NotificationsModule | null> {
  if (!notificationsSupported) return Promise.resolve(null);
  modulePromise ??= import('expo-notifications');
  return modulePromise;
}

/** Cómo se muestran las notificaciones con la app abierta. Llamar una vez al iniciar. */
export async function configureNotifications(): Promise<void> {
  const Notifications = await loadNotifications();
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

async function ensureAndroidChannel(Notifications: NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Recordatorios',
    description: 'Vencimientos de gastos fijos, cuotas y respaldo',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Pide permiso para notificaciones locales. `true` si quedaron permitidas. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  await ensureAndroidChannel(Notifications);
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await withoutAutoLock(() => Notifications.requestPermissionsAsync());
  return requested.granted;
}

/** Reemplaza todos los recordatorios programados por `reminders` (solo notificaciones locales). */
export async function replaceScheduledReminders(reminders: readonly LocalReminder[]): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (reminders.length === 0) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  await ensureAndroidChannel(Notifications);
  for (const reminder of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: { title: reminder.title, body: reminder.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date, channelId: CHANNEL_ID },
    });
  }
}

export async function cancelAllReminders(): Promise<void> {
  const Notifications = await loadNotifications();
  await Notifications?.cancelAllScheduledNotificationsAsync();
}
