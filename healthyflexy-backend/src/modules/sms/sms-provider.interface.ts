/** Результат відправки: id повідомлення в провайдера (Twilio SID), за ним шукають доставку в консолі Twilio */
export interface SmsSendResult {
  id?: string;
  status?: string;
}

/** Порт для SMS: реалізації — Twilio (prod) та Console (dev). */
export interface SmsProvider {
  /** Надсилає SMS. Кидає помилку, якщо провайдер відмовив (→ OTP_SEND_FAILED). */
  send(to: string, body: string): Promise<SmsSendResult>;
}
