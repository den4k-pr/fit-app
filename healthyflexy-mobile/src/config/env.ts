import Constants from 'expo-constants';

interface ExtraConfig {
  apiUrl?: string;
  wsUrl?: string;
  appEnv?: string;
}
const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

/**
 * Значення EXPO_PUBLIC_* підставляються на етапі збірки (звертатися треба саме `process.env.EXPO_PUBLIC_X`,
 * без деструктуризації). Запасний шлях — `extra` з app.config.ts. Після зміни .env: `npx expo start --clear`.
 */
export const env = {
  appEnv: (extra.appEnv ?? 'development') as 'development' | 'preview' | 'production',
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? 'http://localhost:3000/api/v1',
  wsUrl: process.env.EXPO_PUBLIC_WS_URL ?? extra.wsUrl ?? 'http://localhost:3000',
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
  /**
   * Вхід через Google: OAuth Client ID з Google Cloud Console (Credentials) для кожної платформи.
   * Ті самі ID мають бути в GOOGLE_CLIENT_IDS на сервері. Порожньо — кнопки «Увійти через Google» немає.
   */
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
} as const;

export const isProduction = env.appEnv === 'production';
