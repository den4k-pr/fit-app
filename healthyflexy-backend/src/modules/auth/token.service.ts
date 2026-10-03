import { ConfigService } from '@nestjs/config';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { ErrorCode, TOKENS } from '../../common/constants';
import { DevicePlatform } from '../../common/enums';
import { AppException } from '../../common/exceptions/app.exception';
import { JwtAccessPayload } from '../../common/interfaces';
import { hmacSha256Hex, randomToken } from '../../common/utils/hash.util';
import { EnvironmentVariables } from '../../config';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthTokensDto } from './dto';
import { RefreshToken } from './entities/refresh-token.entity';

export interface DeviceInfo {
  deviceId?: string | null;
  platform?: DevicePlatform | null;
  appVersion?: string | null;
}

/**
 * Access JWT (15 хв) + refresh (32 випадкові байти; в БД лише HMAC-хеш).
 * Ротація: кожен refresh видає новий токен і відкликає старий. Повторне використання відкликаного →
 * вважаємо його викраденим і відкликаємо ВСІ токени користувача. Клієнт має робити refresh в один потік.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(RefreshToken) private readonly tokens: Repository<RefreshToken>,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async issue(user: User, device: DeviceInfo = {}): Promise<AuthTokensDto> {
    return (await this.create(user, device)).tokens;
  }

  /** Видає пару токенів і повертає id рядка refresh (потрібен ротації для replacedByTokenId) */
  private async create(
    user: User,
    device: DeviceInfo,
  ): Promise<{ tokens: AuthTokensDto; rowId: string }> {
    // заблокований в адмінці: ні входу, ні оновлення сесії
    if (user.blockedAt) throw new AppException(ErrorCode.ACCOUNT_BLOCKED, HttpStatus.FORBIDDEN);
    const payload: JwtAccessPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = randomToken(TOKENS.REFRESH_TOKEN_BYTES);
    const ttlDays = this.config.get('JWT_REFRESH_TTL_DAYS', { infer: true });
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 3600_000);

    const row = await this.tokens.save(
      this.tokens.create({
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        deviceId: device.deviceId ?? null,
        platform: device.platform ?? null,
        appVersion: device.appVersion ?? null,
        expiresAt,
      }),
    );

    return {
      rowId: row.id,
      tokens: {
        accessToken,
        accessTokenExpiresIn: this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }),
        refreshToken,
        refreshTokenExpiresAt: expiresAt,
      },
    };
  }

  async rotate(refreshToken: string, device: DeviceInfo = {}): Promise<AuthTokensDto> {
    const current = await this.tokens.findOne({ where: { tokenHash: this.hash(refreshToken) } });
    if (!current) throw this.invalid();

    if (current.revokedAt) {
      this.logger.warn({ event: 'refresh_reuse_detected', userId: current.userId });
      await this.revokeAllForUser(current.userId);
      throw this.invalid();
    }
    if (current.expiresAt <= new Date()) throw this.invalid();

    const user = await this.users.findById(current.userId);
    if (!user) throw this.invalid();

    const issued = await this.create(user, {
      deviceId: device.deviceId ?? current.deviceId,
      platform: device.platform ?? current.platform,
      appVersion: device.appVersion ?? current.appVersion,
    });
    await this.tokens.update(
      { id: current.id, revokedAt: IsNull() },
      { revokedAt: new Date(), lastUsedAt: new Date(), replacedByTokenId: issued.rowId },
    );
    return issued.tokens;
  }

  /** Відкликає токен, лише якщо він належить користувачеві (logout) */
  async revoke(refreshToken: string, userId: string): Promise<void> {
    await this.tokens.update(
      { tokenHash: this.hash(refreshToken), userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.tokens.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async purgeExpired(): Promise<number> {
    const result = await this.tokens.delete({ expiresAt: LessThan(new Date()) });
    return result.affected ?? 0;
  }

  private hash(token: string): string {
    return hmacSha256Hex(token, this.config.get('TOKEN_HASH_SECRET', { infer: true }));
  }

  private invalid(): AppException {
    return new AppException(ErrorCode.REFRESH_TOKEN_INVALID, HttpStatus.UNAUTHORIZED);
  }
}
