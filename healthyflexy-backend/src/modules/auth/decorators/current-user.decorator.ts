import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../../../common/interfaces';

/** `@CurrentUser() user: AuthenticatedUser` або `@CurrentUser('id') userId: string` */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    return field ? request.user?.[field] : request.user;
  },
);
