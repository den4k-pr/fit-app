/** +48500000001 → +48•••••0001: для логів і повідомлень про помилки (повний номер лише в базі) */
export function maskPhone(phone: string): string {
  return phone.length <= 7
    ? phone
    : `${phone.slice(0, 3)}${'•'.repeat(phone.length - 7)}${phone.slice(-4)}`;
}
