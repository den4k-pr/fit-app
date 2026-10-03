import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode, SMS_PROVIDER } from '../../common/constants';
import { AppLanguage } from '../../common/enums';
import { AppException } from '../../common/exceptions/app.exception';
import { maskPhone } from '../../common/utils/mask.util';
import { EnvironmentVariables } from '../../config';
import { SmsProvider } from './sms-provider.interface';
import { describeSmsError } from './sms-error';

/** Коротко (одне SMS навіть кирилицею — до 70 символів): назва, код, термін дії */
const OTP_TEXT: Record<AppLanguage, (code: string) => string> = {
  [AppLanguage.UK]: (code) => `Книжка турботи: ваш код ${code}. Діє 5 хв.`,
  [AppLanguage.PL]: (code) => `Książeczka troski: Twój kod ${code}. Ważny 5 min.`,
  [AppLanguage.EN]: (code) => `Care Journal: your code is ${code}. Valid 5 min.`,
  [AppLanguage.RU]: (code) => `Книжка заботы: ваш код ${code}. Действует 5 мин.`,
};

/**
 * Фасад над SmsProvider: локалізований текст і єдина помилка OTP_SEND_FAILED для клієнта.
 * ПРИЧИНУ (код SMSAPI/Twilio + підказка, що виправити) ми пишемо в лог сервера, а не у відповідь.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @Inject(SMS_PROVIDER) private readonly provider: SmsProvider,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  get providerName(): string {
    return this.config.get('SMS_PROVIDER', { infer: true });
  }

  async sendOtp(phone: string, code: string, language: AppLanguage): Promise<void> {
    try {
      const result = await this.provider.send(phone, OTP_TEXT[language](code));
      this.logger.log({
        event: 'sms_accepted',
        provider: this.providerName,
        to: maskPhone(phone),
        ...(result.id ? { sid: result.id } : {}),
        ...(result.status ? { status: result.status } : {}),
      });
    } catch (error) {
      this.logger.error({
        event: 'sms_failed',
        to: maskPhone(phone),
        ...describeSmsError(this.providerName, error),
      });
      throw new AppException(ErrorCode.OTP_SEND_FAILED, HttpStatus.BAD_GATEWAY);
    }
  }
}
