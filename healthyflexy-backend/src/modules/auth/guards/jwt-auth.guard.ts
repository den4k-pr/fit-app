import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Request } from 'express';
import { ErrorCode } from '../../../common/constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { AuthenticatedUser, JwtAccessPayload } from '../../../common/interfaces';
import { UsersService } from '../../users/users.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Глобальний guard (APP_GUARD). Пропускає маршрути з @Public().
 * Bearer → verify → завантажити User за `sub` → `request.user`. Помилки: UNAUTHORIZED / TOKEN_EXPIRED (клієнт робить refresh).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token)
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);

    let payload: JwtAccessPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtAccessPayload>(token);
    } catch (error) {
      const code =
        error instanceof TokenExpiredError ? ErrorCode.TOKEN_EXPIRED : ErrorCode.UNAUTHORIZED;
      throw new AppException(code, HttpStatus.UNAUTHORIZED);
    }

    const user = await this.users.findById(payload.sub);
    if (!user) throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    if (user.blockedAt) throw new AppException(ErrorCode.ACCOUNT_BLOCKED, HttpStatus.FORBIDDEN);
    request.user = {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      language: user.language,
      timezone: user.timezone,
    };
    return true;
  }
}
