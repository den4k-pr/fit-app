import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ErrorCode } from '../../../common/constants';
import { UserRole } from '../../../common/enums';
import { AppException } from '../../../common/exceptions/app.exception';
import { AuthenticatedUser } from '../../../common/interfaces';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** Глобальний guard після JwtAuthGuard. Без @Roles: пропускає. Роль не обрана → ROLE_REQUIRED, чужа роль → FORBIDDEN_ROLE. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const user = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>().user;
    if (!user?.role) throw new AppException(ErrorCode.ROLE_REQUIRED, HttpStatus.FORBIDDEN);
    if (!roles.includes(user.role))
      throw new AppException(ErrorCode.FORBIDDEN_ROLE, HttpStatus.FORBIDDEN);
    return true;
  }
}
