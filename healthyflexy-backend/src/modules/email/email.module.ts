import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_PROVIDER } from '../../common/constants';
import { EmailProviderName, EnvironmentVariables } from '../../config';
import { EmailService } from './email.service';
import { ConsoleEmailProvider } from './providers/console-email.provider';
import { ResendEmailProvider } from './providers/resend-email.provider';

@Module({
  providers: [
    ConsoleEmailProvider,
    ResendEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      inject: [ConfigService, ConsoleEmailProvider, ResendEmailProvider],
      useFactory: (
        config: ConfigService<EnvironmentVariables, true>,
        consoleProvider: ConsoleEmailProvider,
        resendProvider: ResendEmailProvider,
      ) =>
        config.get('EMAIL_PROVIDER', { infer: true }) === EmailProviderName.RESEND
          ? resendProvider
          : consoleProvider,
    },
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule {}
