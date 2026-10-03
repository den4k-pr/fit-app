import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** HMAC-SHA256 (hex): хеші OTP та refresh-токенів; у БД лише хеш, не сам токен */
export const hmacSha256Hex = (value: string, secret: string): string =>
  createHmac('sha256', secret).update(value).digest('hex');

/** Випадковий токен (base64url) */
export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

/** Порівняння без витоку через час виконання */
export function timingSafeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
