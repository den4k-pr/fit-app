import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { maskEmail } from '../../../common/utils/email.util';
import { EnvironmentVariables } from '../../../config';
import { EmailMessage, EmailProvider, EmailSendResult } from '../email-provider.interface';
import { mailSender } from '../email-sender';

/**
 * Resend через офіційний SDK (так само, як у MailService інших проєктів): `resend.emails.send` повертає
 * `{ data, error }`; помилка НЕ ковтається — кидаємо далі, EmailService пише в лог причину й підказку,
 * а клієнт отримує OTP_SEND_FAILED (код у БД при цьому видаляється, повторна спроба не блокується).
 */
@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private client: Resend | null = null;

  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  private resend(): Resend {
    const apiKey = this.config.get('RESEND_API_KEY', { infer: true });
    if (!apiKey) throw new Error('RESEND_API_KEY is not set');
    this.client ??= new Resend(apiKey);
    return this.client;
  }

  async send({ to, subject, html, text }: EmailMessage): Promise<EmailSendResult> {
    this.logger.log(`Відправка листа «${subject}» на ${maskEmail(to)}`);
    const { data, error } = await this.resend().emails.send({
      from: mailSender(this.config),
      to,
      subject,
      html,
      text,
    });
    if (error) {
      throw Object.assign(new Error(error.message), {
        code: error.name,
        status: (error as { statusCode?: number | null }).statusCode ?? undefined,
      });
    }
    return { id: data?.id };
  }
}
