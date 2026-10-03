import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvironmentVariables } from '../../config';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleTokenService } from './google-token.service';
import { OtpCode } from './entities/otp-code.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OtpCode, RefreshToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: { expiresIn: config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }) },
      }),
    }),
    UsersModule,
    SmsModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, TokenService, GoogleTokenService],
  exports: [TokenService, OtpService, JwtModule],
})
export class AuthModule {}
