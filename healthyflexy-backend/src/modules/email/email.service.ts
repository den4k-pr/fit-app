import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER, ErrorCode } from '../../common/constants';
import { AppLanguage } from '../../common/enums';
import { AppException } from '../../common/exceptions/app.exception';
import { maskEmail } from '../../common/utils/email.util';
import { EnvironmentVariables } from '../../config';
import { describeEmailError } from './email-error';
import { EmailProvider } from './email-provider.interface';
import { otpEmail } from './email-templates';

/**
 * Фасад над EmailProvider: локалізований лист із кодом і єдина помилка OTP_SEND_FAILED для клієнта.
 * ПРИЧИНУ (код Resend + підказка, що виправити) пишемо в лог сервера, а не у відповідь.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  get providerName(): string {
    return this.config.get('EMAIL_PROVIDER', { infer: true });
  }

  async sendOtp(to: string, code: string, language: AppLanguage): Promise<void> {
    const { subject, html, text } = otpEmail(language, code);
    try {
      const result = await this.provider.send({ to, subject, html, text });
      this.logger.log({
        event: 'email_accepted',
        provider: this.providerName,
        to: maskEmail(to),
        ...(result.id ? { id: result.id } : {}),
      });
    } catch (error) {
      this.logger.error({
        event: 'email_failed',
        to: maskEmail(to),
        ...describeEmailError(this.providerName, error),
      });
      throw new AppException(ErrorCode.OTP_SEND_FAILED, HttpStatus.BAD_GATEWAY);
    }
  }
}
