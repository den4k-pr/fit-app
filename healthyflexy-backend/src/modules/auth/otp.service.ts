import { ConfigService } from '@nestjs/config';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'node:crypto';
import { IsNull, LessThan, MoreThan, Repository } from 'typeorm';
import { ErrorCode, OTP } from '../../common/constants';
import { AppLanguage } from '../../common/enums';
import { AppException } from '../../common/exceptions/app.exception';
import { hmacSha256Hex, timingSafeEqualHex } from '../../common/utils/hash.util';
import { EnvironmentVariables } from '../../config';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { RequestOtpResponseDto } from './dto';
import { OtpCode } from './entities/otp-code.entity';

/** Куди йде код: SMS на номер або лист на пошту */
export type OtpChannel = 'sms' | 'email';

/**
 * Життєвий цикл OTP (правила: common/constants → OTP).
 * У БД лише HMAC-хеш `target:code` (target = номер або пошта); сам код — лише в листі/SMS. Код не логуємо.
 * Правильно введений код з листа = пошта підтверджена (при реєстрації й при кожному вході).
 */
@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpCode) private readonly codes: Repository<OtpCode>,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly sms: SmsService,
    private readonly email: EmailService,
  ) {}

  async issue(
    target: string,
    channel: OtpChannel,
    ip: string | null,
    language: AppLanguage,
  ): Promise<RequestOtpResponseDto> {
    const now = new Date();
    const last = await this.codes.findOne({ where: { target }, order: { createdAt: 'DESC' } });
    if (last && now.getTime() - last.createdAt.getTime() < OTP.RESEND_COOLDOWN_SECONDS * 1000) {
      throw new AppException(ErrorCode.OTP_COOLDOWN, HttpStatus.TOO_MANY_REQUESTS);
    }
    const windowStart = new Date(now.getTime() - OTP.REQUEST_WINDOW_MINUTES * 60_000);
    const recent = await this.codes.count({ where: { target, createdAt: MoreThan(windowStart) } });
    if (recent >= OTP.MAX_REQUESTS_PER_WINDOW) {
      throw new AppException(ErrorCode.TOO_MANY_REQUESTS, HttpStatus.TOO_MANY_REQUESTS);
    }

    // Тестових адрес/номерів із фіксованим кодом немає: кожен код — випадковий і приходить лише листом/SMS
    const code = String(randomInt(0, 10 ** OTP.LENGTH)).padStart(OTP.LENGTH, '0');
    const saved = await this.codes.save(
      this.codes.create({
        target,
        codeHash: this.hash(target, code),
        expiresAt: new Date(now.getTime() + OTP.TTL_SECONDS * 1000),
        requestIp: ip,
      }),
    );
    try {
      await (channel === 'sms'
        ? this.sms.sendOtp(target, code, language)
        : this.email.sendOtp(target, code, language));
    } catch (error) {
      await this.codes.delete({ id: saved.id }); // не блокуємо повторну спробу cooldown-ом
      throw error;
    }
    return { retryAfterSeconds: OTP.RESEND_COOLDOWN_SECONDS, expiresInSeconds: OTP.TTL_SECONDS };
  }

  /** Перевіряє код. Успіх → код «спожито» (одноразовий). */
  async verify(target: string, code: string): Promise<void> {
    const now = new Date();
    const current = await this.codes.findOne({
      where: { target, consumedAt: IsNull(), expiresAt: MoreThan(now) },
      order: { createdAt: 'DESC' },
    });
    if (!current) throw new AppException(ErrorCode.OTP_EXPIRED, HttpStatus.GONE);
    if (current.attempts >= OTP.MAX_VERIFY_ATTEMPTS) {
      throw new AppException(ErrorCode.OTP_TOO_MANY_ATTEMPTS, HttpStatus.TOO_MANY_REQUESTS);
    }

    if (!timingSafeEqualHex(current.codeHash, this.hash(target, code))) {
      await this.codes.increment({ id: current.id }, 'attempts', 1);
      const exhausted = current.attempts + 1 >= OTP.MAX_VERIFY_ATTEMPTS;
      throw new AppException(
        exhausted ? ErrorCode.OTP_TOO_MANY_ATTEMPTS : ErrorCode.OTP_INVALID,
        exhausted ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.UNAUTHORIZED,
      );
    }

    // атомарно «споживаємо»: два паралельні verify не пройдуть обидва
    const result = await this.codes.update(
      { id: current.id, consumedAt: IsNull() },
      { consumedAt: now },
    );
    if (!result.affected) throw new AppException(ErrorCode.OTP_EXPIRED, HttpStatus.GONE);
  }

  async purgeExpired(): Promise<number> {
    const threshold = new Date(Date.now() - 24 * 3600_000);
    const result = await this.codes.delete({ expiresAt: LessThan(threshold) });
    return result.affected ?? 0;
  }

  private hash(target: string, code: string): string {
    return hmacSha256Hex(
      `${target}:${code}`,
      this.config.get('TOKEN_HASH_SECRET', { infer: true }),
    );
  }
}
