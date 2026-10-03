import { env } from '@/config/env';

/** Корінь сервера без /api/v1: `http://192.168.1.5:3000` */
export const serverOrigin = (): string => /^(https?:\/\/[^/]+)/.exec(env.apiUrl)?.[1] ?? env.apiUrl;

/** Публічний healthcheck (не потребує входу): GET http://IP:3000/health */
export const healthUrl = (): string => `${serverOrigin()}/health`;

/** На реальному телефоні `localhost` = сам телефон, а не комп'ютер із сервером */
export const isLocalhostUrl = (): boolean => /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(env.apiUrl);
