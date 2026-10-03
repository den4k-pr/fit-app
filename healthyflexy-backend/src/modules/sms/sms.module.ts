import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SMS_PROVIDER } from '../../common/constants';
import { EnvironmentVariables, SmsProviderName } from '../../config';
import { ConsoleSmsProvider } from './providers/console-sms.provider';
import { SmsapiSmsProvider } from './providers/smsapi-sms.provider';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';
import { SmsService } from './sms.service';
import { SmsWebhookController } from './sms-webhook.controller';

@Module({
  controllers: [SmsWebhookController],
  providers: [
    ConsoleSmsProvider,
    SmsapiSmsProvider,
    TwilioSmsProvider,
    {
      provide: SMS_PROVIDER,
      inject: [ConfigService, ConsoleSmsProvider, SmsapiSmsProvider, TwilioSmsProvider],
      useFactory: (
        config: ConfigService<EnvironmentVariables, true>,
        consoleProvider: ConsoleSmsProvider,
        smsapiProvider: SmsapiSmsProvider,
        twilioProvider: TwilioSmsProvider,
      ) => {
        const name = config.get('SMS_PROVIDER', { infer: true });
        if (name === SmsProviderName.SMSAPI) return smsapiProvider;
        if (name === SmsProviderName.TWILIO) return twilioProvider;
        return consoleProvider;
      },
    },
    SmsService,
  ],
  exports: [SmsService],
})
export class SmsModule {}
