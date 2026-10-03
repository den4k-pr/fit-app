import { useEffect } from 'react';
import { DevSettings } from 'react-native';
import { env } from '@/config/env';
import { DEFAULT_LIMITS, readCachedConfig, saveConfig, type RemoteAppConfig } from '@/config/remote-config';
import { applyContentOverrides } from '@/i18n';

/** Якщо нова палітра прийшла в перші секунди після старту (ще заставка/перший екран) — перезапуск одразу */
const RELOAD_WINDOW_MS = 6000;
const startedAt = Date.now();

async function reloadApp(): Promise<void> {
  try {
    // ліниво: клієнт без нативного expo-updates не має падати ще на імпорті
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Updates = require('expo-updates') as typeof import('expo-updates');
    await Updates.reloadAsync();
  } catch {
    if (__DEV__) DevSettings.reload();
  }
}

/**
 * Раз на запуск тягне налаштування з CRM. Тексти застосовуються одразу; нова палітра — перезапуском
 * (стилі екранів створені при імпорті), якщо застосунок щойно стартував, інакше — з наступного запуску.
 */
export function useRemoteAppConfig(): void {
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    void (async () => {
      try {
        const res = await fetch(`${env.apiUrl}/app-config`, { signal: controller.signal });
        if (!res.ok) return;
        const fresh = (await res.json()) as RemoteAppConfig;
        const cached = readCachedConfig();
        if (cached?.version === fresh.version) return;

        saveConfig({ ...fresh, limits: { ...DEFAULT_LIMITS, ...fresh.limits } });
        applyContentOverrides(fresh.content ?? {}, cached?.content ?? {});

        const themeChanged = JSON.stringify(cached?.theme ?? null) !== JSON.stringify(fresh.theme ?? null);
        if (themeChanged && Date.now() - startedAt < RELOAD_WINDOW_MS) await reloadApp();
      } catch {
        // офлайн або сервер недоступний — працюємо з кешем / стандартним виглядом
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);
}
