// eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro-конфіг завантажується Node у CJS, без TS
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Застосунок підтримує лише iOS/Android (камера, жести, нативні модулі — web ніколи не тестувався
 * і `react-native-web` навіть не встановлено). Без цього Metro все одно намагається зібрати web-бандл
 * для внутрішньої панелі дев-тулзів і падає з "Unable to resolve react-native-web/dist/index".
 */
config.resolver.platforms = ['ios', 'android'];

module.exports = config;
