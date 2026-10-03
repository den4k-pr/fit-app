import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * APP_ENV: development | preview | production (задається в eas.json → build.<profile>.env).
 * Публічні змінні для коду застосунку — лише з префіксом EXPO_PUBLIC_ (див. src/config/env.ts).
 */
const APP_ENV = process.env.APP_ENV ?? 'development';
const IS_PROD = APP_ENV === 'production';

const BUNDLE_ID = 'com.healthyflexy.app'; // TODO: замінити на ідентифікатор із акаунтів Apple/Google
const ENV_SUFFIX = IS_PROD ? '' : `.${APP_ENV}`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_PROD ? 'Книжка турботи' : `Книжка турботи (${APP_ENV})`,
  slug: 'healthyflexy',
  owner: 'den4k_34',
  scheme: 'healthyflexy',
  version: '0.1.0',
  // EAS Update (канали preview/production з eas.json). runtimeVersion = версія застосунку:
  // OTA-оновлення JS приходять лише на збірки тієї ж версії (нативний код не змішується)
  runtimeVersion: { policy: 'appVersion' },
  updates: { url: 'https://u.expo.dev/e6c444bd-95c5-4a4c-9102-b7c4535dddd5' },
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: `${BUNDLE_ID}${ENV_SUFFIX}`,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: `${BUNDLE_ID}${ENV_SUFFIX}`,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#17593A',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        backgroundColor: '#17593A',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'Камера потрібна, щоб перевірити, що вправу виконано.',
        // Кадри знімаємо БЕЗ звуку: мікрофон не запитуємо (менше довіри-тертя, менше приватних даних)
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-image-picker',
      {
        // фото-аватар у профілі. cameraPermission НЕ вимикати: на Android `false` блокує дозвіл CAMERA
        // для всього застосунку й зламає зйомку вправ (expo-camera)
        photosPermission: 'Доступ до фото потрібен, щоб поставити своє фото в профіль.',
        microphonePermission: false,
      },
    ],
    [
      'expo-sensors',
      {
        // iOS «Рух і фітнес»: крокомір для вправ на кроки та картки «Кроки сьогодні»
        motionPermission:
          'Крокомір рахує ваші кроки, щоб зарахувати прогулянку й показати кроки за день.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/notification-icon.png',
        color: '#33B26E',
      },
    ],
    [
      'expo-localization',
      { supportedLocales: { ios: ['uk', 'ru', 'pl', 'en'], android: ['uk', 'ru', 'pl', 'en'] } },
    ],
    'expo-secure-store',
    [
      // Оплата фонду: PaymentSheet (картка, Apple Pay, Google Pay, BLIK, PayPal). Merchant ID — з Apple Developer
      // (Identifiers → Merchant IDs) і має бути доданий у Stripe Dashboard → Settings → Apple Pay
      '@stripe/stripe-react-native',
      {
        merchantIdentifier: process.env.STRIPE_APPLE_MERCHANT_ID || `merchant.${BUNDLE_ID}`,
        enableGooglePay: true,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    appEnv: APP_ENV,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    wsUrl: process.env.EXPO_PUBLIC_WS_URL,
    // EAS-проєкт @den4k_34/healthyflexy (динамічний конфіг: EAS не може вписати id сам)
    eas: { projectId: process.env.EAS_PROJECT_ID || 'e6c444bd-95c5-4a4c-9102-b7c4535dddd5' },
  },
});
