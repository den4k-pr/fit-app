import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables, NodeEnv } from '../../../config';
import { SmsProvider, SmsSendResult } from '../sms-provider.interface';

/**
 * Локальна розробка: SMS НЕ відправляється, текст (з кодом) друкується в лозі сервера.
 * У production відмовляє (OTP_SEND_FAILED) — вхід за телефоном там працює лише зі справжнім SMS_PROVIDER=twilio,
 * а застосунок без нього взагалі не показує вкладку «Телефон» (GET /auth/config → phoneEnabled: false).
 */
@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  private readonly logger = new Logger(ConsoleSmsProvider.name);
  /** Лише NODE_ENV=test: останнє SMS кожному номеру (e2e читають з нього код) */
  private readonly outbox = new Map<string, string>();

  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  send(to: string, body: string): Promise<SmsSendResult> {
    const env = this.config.get('NODE_ENV', { infer: true });
    if (env === NodeEnv.PRODUCTION) {
      return Promise.reject(new Error('SMS_PROVIDER=console is not allowed in production'));
    }
    if (env === NodeEnv.TEST) {
      this.outbox.set(to, body);
      return Promise.resolve({});
    }
    this.logger.warn(`📲 SMS НЕ відправлено (SMS_PROVIDER=console). Текст для ${to}: «${body}»`);
    return Promise.resolve({});
  }

  /** e2e: текст останнього SMS на номер */
  lastMessage(to: string): string | undefined {
    return this.outbox.get(to);
  }
}
