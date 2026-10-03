import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { EnvironmentVariables } from '../../../config';
import { SmsProvider, SmsSendResult } from '../sms-provider.interface';

/** Адреса, куди Twilio повідомляє про ДОСТАВКУ (delivered / undelivered + код причини) */
export const twilioStatusUrl = (config: ConfigService<EnvironmentVariables, true>): string =>
  `${config.get('PUBLIC_BASE_URL', { infer: true }).replace(/\/$/, '')}/${config.get('API_GLOBAL_PREFIX', { infer: true })}/sms/twilio-status`;

/**
 * Twilio: `messagingServiceSid` (краще) або `from`. Клієнт створюється ліниво, лише при першій відправці.
 * Успішна відповідь API означає лише «прийнято в чергу» (status=queued); чи дійшло SMS, покаже вебхук статусу.
 */
@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  private client?: Twilio;

  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  async send(to: string, body: string): Promise<SmsSendResult> {
    const cfg = this.config;
    const sid = cfg.get('TWILIO_ACCOUNT_SID', { infer: true });
    const token = cfg.get('TWILIO_AUTH_TOKEN', { infer: true });
    const service = cfg.get('TWILIO_MESSAGING_SERVICE_SID', { infer: true });
    const from = cfg.get('TWILIO_FROM_NUMBER', { infer: true });
    if (!sid || !token || (!service && !from)) throw new Error('Twilio is not configured');

    // Статус доставки Twilio надсилає лише на публічну адресу (не localhost)
    const publicUrl = !/localhost|127\.0\.0\.1/.test(cfg.get('PUBLIC_BASE_URL', { infer: true }));
    const statusCallback = publicUrl ? { statusCallback: twilioStatusUrl(cfg) } : {};

    this.client ??= new Twilio(sid, token);
    const message = await this.client.messages.create(
      service
        ? { to, body, messagingServiceSid: service, ...statusCallback }
        : { to, body, from, ...statusCallback },
    );
    return { id: message.sid, status: message.status };
  }
}
