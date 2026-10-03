import { readCachedConfig, sanitizeThemeColors } from '../config/remote-config';
import { colors } from './tokens';

/**
 * Імпортується ПЕРШИМ у `index.ts`: підміняє токени кольорів палітрою з CRM (з кешу попереднього запуску)
 * до того, як завантажаться екрани — їхні `StyleSheet.create` вже побачать нові кольори.
 * Нова палітра з сервера застосовується перезапуском (див. `useRemoteAppConfig`).
 */
try {
  const cached = readCachedConfig();
  Object.assign(colors as Record<string, string>, sanitizeThemeColors(cached?.theme, colors));
} catch {
  // тема з CRM — не критична: без неї лишається стандартна палітра
}
