/** Ключі SecureStore (лише [A-Za-z0-9._-]) та AsyncStorage */
export const SECURE_KEYS = {
  refreshToken: 'hf.refresh-token',
  deviceId: 'hf.device-id',
  /** Префікс refresh-токена збереженого акаунта: `hf.account.<userId>` (перемикач акаунтів) */
  accountTokenPrefix: 'hf.account.',
} as const;

export const ASYNC_KEYS = {
  onboarding: 'hf.onboarding',
  settings: 'hf.settings',
  pushTokenSynced: 'hf.push-token-synced',
  /** Список акаунтів, у які входили на цьому пристрої (без секретів) */
  savedAccounts: 'hf.saved-accounts',
} as const;
