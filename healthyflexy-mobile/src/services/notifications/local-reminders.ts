import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';

/**
 * У Expo Go (SDK 53+) на Android сам `import * as Notifications from 'expo-notifications'`
 * кидає виняток при завантаженні модуля (push-функціонал прибрано з Expo Go) — ЩЕ ДО будь-якої
 * перевірки нижче, бо звичайний ESM-імпорт виконується одразу при завантаженні файлу. Через це
 * валився КОЖЕН екран, що транзитивно імпортує цей файл (ReminderCard → ProgressScreen → …).
 * Тому нативний модуль вантажимо ЛІНИВО через require() у try/catch — лише коли він реально
 * потрібен і лише поза Expo Go: так виняток можна перехопити.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let cached: typeof NotificationsModule | null | undefined;

function loadNotifications(): typeof NotificationsModule | null {
  if (cached !== undefined) return cached;
  if (isExpoGo) return (cached = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- лінива підв'язка нативного модуля: звичайний import впав би одразу при завантаженні файлу
    const mod = require('expo-notifications') as typeof NotificationsModule;
    /** Показувати сповіщення й коли застосунок відкритий (для кнопки «Перевірити сповіщення») */
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    cached = mod;
  } catch {
    // Платформа/середовище не підтримує сповіщення — тихо ігноруємо, кнопка «Перевірити» поверне false
    cached = null;
  }
  return cached;
}

/** true, якщо дозвіл є (запитує, якщо ще не питали). Завжди false в Expo Go/непідтримуваному середовищі. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = loadNotifications();
  if (!Notifications) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

/** Тестове локальне сповіщення через 1 с. false → немає дозволу або платформа не підтримує. */
export async function sendTestNotification(title: string, body: string): Promise<boolean> {
  const Notifications = loadNotifications();
  if (!Notifications) return false;
  try {
    if (!(await ensureNotificationPermission())) return false;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
    });
    return true;
  } catch {
    return false;
  }
}
