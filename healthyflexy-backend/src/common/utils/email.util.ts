/** Адреса пошти в канонічному вигляді: без пробілів, нижній регістр (унікальність і хеш коду рахуються за нею) */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** name@example.com → n•••@example.com: для логів */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  return domain ? `${name.slice(0, 1)}•••@${domain}` : email;
}
