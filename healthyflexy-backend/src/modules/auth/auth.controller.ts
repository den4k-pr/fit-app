import { Body, Controller, Get, Headers, HttpCode, Ip, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AppLanguage } from '../../common/enums';
import { SuccessResponseDto } from '../../common/dto/message-response.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import {
  AuthConfigResponseDto,
  GoogleAuthDto,
  AuthTokensDto,
  LogoutDto,
  RequestEmailOtpDto,
  VerifyEmailOtpDto,
  RefreshTokenDto,
  RequestOtpDto,
  RequestOtpResponseDto,
  VerifyOtpDto,
  VerifyOtpResponseDto,
} from './dto';

/** Мова SMS/листа: з Accept-Language клієнта (uk/pl/en/ru), інакше українська */
function languageFrom(header: string | undefined): AppLanguage {
  const code = header?.slice(0, 2).toLowerCase();
  if (code === AppLanguage.PL) return AppLanguage.PL;
  if (code === AppLanguage.EN) return AppLanguage.EN;
  if (code === AppLanguage.RU) return AppLanguage.RU;
  return AppLanguage.UK;
}

/**
 * POST /auth/otp/request  @Public  (throttle: суворий)
 * POST /auth/otp/verify   @Public
 * POST /auth/email/request @Public  (код на пошту)
 * POST /auth/email/verify  @Public
 * POST /auth/google      @Public  (вхід через Google: ID-токен)
 * GET  /auth/config       @Public  (які способи входу доступні: emailEnabled, phoneEnabled, googleEnabled)
 * POST /auth/refresh      @Public  (ротація refresh-токена)
 * POST /auth/logout       відкликає токен цього пристрою
 * POST /auth/logout-all   відкликає токени всіх пристроїв
 */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('otp/request')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  requestOtp(
    @Body() dto: RequestOtpDto,
    @Ip() ip: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<RequestOtpResponseDto> {
    return this.auth.requestOtp(dto, ip || null, languageFrom(acceptLanguage));
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    return this.auth.verifyOtp(dto);
  }

  @Public()
  @Post('email/request')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  requestEmailOtp(
    @Body() dto: RequestEmailOtpDto,
    @Ip() ip: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<RequestOtpResponseDto> {
    return this.auth.requestEmailOtp(dto, ip || null, languageFrom(acceptLanguage));
  }

  @Public()
  @Post('email/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  verifyEmailOtp(@Body() dto: VerifyEmailOtpDto): Promise<VerifyOtpResponseDto> {
    return this.auth.verifyEmailOtp(dto);
  }

  @Public()
  @Post('google')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  loginWithGoogle(@Body() dto: GoogleAuthDto): Promise<VerifyOtpResponseDto> {
    return this.auth.loginWithGoogle(dto);
  }

  @Public()
  @Get('config')
  getConfig(): AuthConfigResponseDto {
    return this.auth.getConfig();
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensDto> {
    return this.auth.refresh(dto);
  }

  @Post('logout-all')
  @HttpCode(200)
  async logoutAll(@CurrentUser('id') userId: string): Promise<SuccessResponseDto> {
    await this.auth.logoutAll(userId);
    return { success: true };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @CurrentUser('id') userId: string,
    @Body() dto: LogoutDto,
  ): Promise<SuccessResponseDto> {
    await this.auth.logout(userId, dto);
    return { success: true };
  }
}
