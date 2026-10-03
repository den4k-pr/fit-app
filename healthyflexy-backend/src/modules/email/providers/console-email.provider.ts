import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables, NodeEnv } from '../../../config';
import { EmailMessage, EmailProvider, EmailSendResult } from '../email-provider.interface';

/**
 * Локальна розробка: лист НЕ надсилається, текст із кодом друкується в лозі сервера.
 * У production цей провайдер ВІДМОВЛЯЄ (код нікому не прийшов би — краще чесна помилка OTP_SEND_FAILED і ❌ на
 * старті сервера, ніж «тихий» вхід лише для того, хто читає логи). Для справжніх листів: EMAIL_PROVIDER=resend.
 */
@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);
  /** Лише NODE_ENV=test: останній лист кожному отримувачу (e2e читають з нього код, як людина з пошти) */
  private readonly outbox = new Map<string, EmailMessage>();

  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  send(message: EmailMessage): Promise<EmailSendResult> {
    const env = this.config.get('NODE_ENV', { infer: true });
    if (env === NodeEnv.PRODUCTION) {
      return Promise.reject(new Error('EMAIL_PROVIDER=console is not allowed in production'));
    }
    if (env === NodeEnv.TEST) {
      this.outbox.set(message.to, message);
      return Promise.resolve({});
    }
    this.logger.warn(
      `✉️  Лист НЕ відправлено (EMAIL_PROVIDER=console). Кому: ${message.to}. Тема: «${message.subject}». Текст: «${message.text}»`,
    );
    return Promise.resolve({});
  }

  /** e2e: останній лист на адресу */
  lastMessage(to: string): EmailMessage | undefined {
    return this.outbox.get(to);
  }
}
