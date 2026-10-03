import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../config';

/** Тестовий відправник Resend: без власного домену шле лише на адресу власника акаунта Resend */
export const RESEND_SANDBOX_SENDER = 'onboarding@resend.dev';

/**
 * Відправник листів: «MAIL_FROM_NAME <MAIL_FROM>» (адреса на вашому підтвердженому домені), як в інших проєктах;
 * запасний варіант — старий повний EMAIL_FROM; без жодного — тестовий відправник Resend.
 */
export function mailSender(config: ConfigService<EnvironmentVariables, true>): string {
  const address = config.get('MAIL_FROM', { infer: true })?.trim();
  if (address) return `${config.get('MAIL_FROM_NAME', { infer: true })} <${address}>`;
  return (
    config.get('EMAIL_FROM', { infer: true })?.trim() ||
    `${config.get('MAIL_FROM_NAME', { infer: true })} <${RESEND_SANDBOX_SENDER}>`
  );
}
