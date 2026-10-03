/** GET /auth/config: які способи входу доступні застосунку */
export class AuthConfigResponseDto {
  /** Завжди true: вхід лише з кодом із листа/SMS (поле лишається для старих версій застосунку) */
  otpRequired: boolean;

  /** Вхід кодом на пошту: листи справді надсилаються (Resend), або це не production */
  emailEnabled: boolean;

  /** Вхід кодом із SMS: налаштовано SMS-провайдера (SMSAPI / Twilio), або це не production */
  phoneEnabled: boolean;

  /** Вхід через Google доступний (на сервері задано GOOGLE_CLIENT_IDS) */
  googleEnabled: boolean;
}
