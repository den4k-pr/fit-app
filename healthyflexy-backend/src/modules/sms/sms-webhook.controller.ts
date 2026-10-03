import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { validateRequest } from 'twilio';
import { ErrorCode } from '../../common/constants';
import { AppException } from '../../common/exceptions/app.exception';
import { maskPhone } from '../../common/utils/mask.util';
import { EnvironmentVariables, SmsProviderName } from '../../config';
import { Public } from '../auth/decorators/public.decorator';
import { twilioStatusUrl } from './providers/twilio-sms.provider';
import { describeSmsError } from './sms-error';

/**
 * Вебхук Twilio «статус доставки»: саме він пояснює, ЧОМУ код не дійшов на телефон (оператор відхилив, номер
 * не підтверджено в пробному акаунті, країну заблоковано…). Запис у лозі: `event=sms_delivery status=… errorCode=… hint=…`.
 * Захищено підписом Twilio (X-Twilio-Signature): без нього 403. Працює лише при SMS_PROVIDER=twilio.
 */
@ApiExcludeController()
@Controller('sms')
export class SmsWebhookController {
  private readonly logger = new Logger('SmsDelivery');

  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  @Public()
  @Post('twilio-status')
  @HttpCode(HttpStatus.NO_CONTENT)
  status(
    @Body() body: Record<string, string>,
    @Headers('x-twilio-signature') signature?: string,
  ): void {
    if (this.config.get('SMS_PROVIDER', { infer: true }) !== SmsProviderName.TWILIO)
      throw new NotFoundException();

    const token = this.config.get('TWILIO_AUTH_TOKEN', { infer: true }) ?? '';
    if (!signature || !validateRequest(token, signature, twilioStatusUrl(this.config), body)) {
      throw new AppException(ErrorCode.WEBHOOK_SIGNATURE_INVALID, HttpStatus.FORBIDDEN);
    }

    const state = body.MessageStatus ?? body.SmsStatus ?? 'unknown';
    const entry = {
      event: 'sms_delivery',
      sid: body.MessageSid,
      status: state,
      to: maskPhone(body.To ?? ''),
    };
    if (state === 'delivered') {
      this.logger.log(entry);
    } else if (state === 'failed' || state === 'undelivered') {
      const code = body.ErrorCode ? Number(body.ErrorCode) : undefined;
      const failure = describeSmsError('twilio', {
        code,
        message: body.ErrorMessage ?? 'delivery failed',
      });
      this.logger.error({
        ...entry,
        errorCode: code,
        ...(failure.hint ? { hint: failure.hint } : {}),
      });
    } else {
      this.logger.debug(entry); // queued / sent: проміжні статуси
    }
  }
}
