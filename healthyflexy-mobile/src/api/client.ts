import axios from 'axios';
import { env } from '@/config/env';

/**
 * Єдиний HTTP-клієнт. Інтерцептори (Bearer, авто-refresh при 401, нормалізація помилок)
 * підключає `installApiInterceptors()` з `./interceptors` — викликається один раз у корені застосунку.
 */
/**
 * Скільки чекаємо на відповідь. Було 20 с × 3 спроби = хвилина «крутилки» на поганому зв'язку;
 * звичайна відповідь сервера — 0,2–0,5 с, AI-перевірка кадрів — до ~10 с (для неї окремий таймаут).
 */
export const REQUEST_TIMEOUT_MS = 15_000;

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});
