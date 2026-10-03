import { IsEnum } from 'class-validator';
import { UserRole } from '../../../common/enums';

/** PUT /users/me/role: можна змінити, поки немає сім'ї (далі ROLE_ALREADY_SET) */
export class SetRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
