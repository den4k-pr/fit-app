import { RelationshipType } from '../../../common/enums';

export class InviteResponseDto {
  /** 6 символів без 0 O 1 I L, напр. `ABC234` */
  code: string;

  /** `healthyflexy://join/ABC234` */
  deepLink: string;
  relationship: RelationshipType;
  expiresAt: Date;
}
