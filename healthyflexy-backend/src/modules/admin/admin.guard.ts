import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ErrorCode } from '../../common/constants';
import { AppException } from '../../common/exceptions/app.exception';
import { AdminAuthService } from './admin-auth.service';

/** Захищає маршрути /admin/* адмін-токеном (контролери позначені @Public(), тож користувацький guard їх пропускає) */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token)
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    await this.auth.verify(token);
    return true;
  }
}
