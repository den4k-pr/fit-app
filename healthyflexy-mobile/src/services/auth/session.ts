import { Platform } from 'react-native';
import { api } from '@/api/gateway';
import { queryClient } from '@/api/query-client';
import { queryKeys } from '@/api/query-keys';
import { env } from '@/config/env';
import { detectDeviceLanguage, resolveUiLanguage, setAppLanguage } from '@/i18n';
import { SERVER_LANGUAGE } from '@/constants/languages';
import { useSettingsStore } from '@/store/settings.store';
import { getDeviceTimezone } from '@/lib/timezone';
import { useAuthStore } from '@/store/auth.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import type { AuthTokens, User, VerifyOtpRequest } from '@/types';
import { DevicePlatform } from '@/types';
import { rememberAccount, syncAccountToken } from './saved-accounts';
import { getDeviceId, saveRefreshToken, setAccessToken } from './token-storage';

/** Зберегти пару токенів: access — у пам'яті, refresh — у SecureStore */
export async function persistTokens(tokens: AuthTokens): Promise<void> {
  setAccessToken(tokens.accessToken);
  await saveRefreshToken(tokens.refreshToken);
  // перемикач акаунтів: збережена копія токена поточного акаунта завжди найсвіжіша
  const userId = useAuthStore.getState().user?.id;
  if (userId) await syncAccountToken(userId, tokens.refreshToken);
}

/** Дані пристрою для POST /auth/otp/verify (для керування сесіями) */
export async function deviceInfo(): Promise<Pick<VerifyOtpRequest, 'deviceId' | 'platform' | 'appVersion'>> {
  return {
    deviceId: await getDeviceId(),
    platform: Platform.OS === 'ios' ? DevicePlatform.Ios : DevicePlatform.Android,
    appVersion: env.appVersion,
  };
}

/** Чи є в акаунта сім'я (батько/мати без сім'ї потрапляє на екран «Чекаємо на запрошення»). Сім'я — одразу в кеш. */
export async function checkFamily(): Promise<boolean> {
  // список сімей (порожній — звичайна відповідь 200), а не /families/current, що без сім'ї відповідає 404
  const families = await api.families.list();
  queryClient.setQueryData(queryKeys.family.list(), families);
  return families.length > 0;
}

/**
 * Завершення входу/старту сесії: згода з consent-екрана (якщо ще не на сервері), таймзона пристрою (ТЗ §8.8),
 * мова інтерфейсу з профілю, стан сім'ї. Повертає актуального користувача.
 * Незалежні запити (мова, таймзона, сім'я) — ПАРАЛЕЛЬНО: раніше це було до 4 послідовних обмінів із сервером.
 */
export async function establishSession(
  user: User,
  /** hasFamily — уже відомо (старт застосунку запитує сім'ю паралельно з профілем) */
  options: { isNewUser: boolean; hasFamily?: boolean },
): Promise<User> {
  let current = user;
  if (!current.gdprConsentAt && useOnboardingStore.getState().consentAcceptedAt) {
    current = await api.users.acceptConsent({ termsAndPrivacyAccepted: true, disclaimerAccepted: true, doctorConsultationConfirmed: true });
  }
  const profilePatch: { language?: User['language']; timezone?: string } = {};
  // ТЗ §5.4: після ПЕРШОГО входу мова профілю = мова пристрою (uk/pl/en/ru, інакше en)
  if (options.isNewUser) {
    const language = useSettingsStore.getState().languageOverride ?? detectDeviceLanguage();
    useSettingsStore.getState().setLanguageOverride(language);
    if (current.language !== SERVER_LANGUAGE[language]) profilePatch.language = SERVER_LANGUAGE[language];
  } else {
    // мова, явно обрана на цьому пристрої (перший екран або профіль), переважає мову профілю
    const chosen = useSettingsStore.getState().languageOverride;
    if (chosen && current.language !== SERVER_LANGUAGE[chosen]) profilePatch.language = SERVER_LANGUAGE[chosen];
  }
  const timezone = getDeviceTimezone();
  if (current.timezone !== timezone) profilePatch.timezone = timezone;

  const base = current;
  const [updated, hasFamily] = await Promise.all([
    Object.keys(profilePatch).length > 0 ? api.users.updateProfile(profilePatch).catch(() => base) : Promise.resolve(base),
    !base.role ? Promise.resolve(false) : options.hasFamily !== undefined ? Promise.resolve(options.hasFamily) : checkFamily().catch(() => false),
  ]);
  current = updated;
  await setAppLanguage(resolveUiLanguage(current.language));
  const store = useAuthStore.getState();
  store.setHasFamily(hasFamily);
  store.setSignedIn(current);
  // перемикач акаунтів (SecureStore/AsyncStorage) — не затримує вхід
  void rememberAccount(current).catch(() => undefined);
  return current;
}
