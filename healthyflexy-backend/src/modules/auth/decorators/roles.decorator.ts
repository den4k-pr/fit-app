import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../../common/enums';

export const ROLES_KEY = 'roles';

/** Обмеження за роллю: `@Roles(UserRole.CHILD)` */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
