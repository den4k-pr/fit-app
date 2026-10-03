import { UserRole } from '../../common/enums';
import { formatHHmm } from '../../common/utils/date.util';
import { levelOf, progressionFactor } from '../../common/utils/progression.util';
import { FamilyResponseDto } from './dto';
import { Family } from './entities/family.entity';

export interface FamilyResponseExtras {
  /** Підписане посилання на аватар другої сторони */
  counterpartAvatarUrl: string | null;
  /** Локальна дата батька/матері (для рівня автоускладнення) */
  today: string;
}

/** Сім'я очима конкретного учасника: `myRole` і `counterpart` залежать від того, хто питає */
export function toFamilyResponse(
  family: Family,
  myUserId: string,
  extras: FamilyResponseExtras,
): FamilyResponseDto {
  const iAmParent = family.parentId === myUserId;
  const other = iAmParent ? family.child : family.parent;
  return {
    id: family.id,
    relationship: family.relationship,
    parentLabel: family.parentLabel,
    rate: family.rate,
    currency: family.currency,
    planDays: [...family.planDays].sort((a, b) => a - b),
    reminderTime: formatHHmm(family.reminderTime),
    workoutTypes: family.workoutTypes,
    workoutMinutes: family.workoutMinutes,
    autoProgression: family.autoProgression,
    progressionPct: family.progressionPct,
    exerciseMode: family.exerciseMode,
    selectedExerciseIds: family.selectedExerciseIds ?? [],
    level: levelOf(progressionFactor(family, extras.today)),
    myRole: iAmParent ? UserRole.PARENT : UserRole.CHILD,
    counterpart: {
      id: other.id,
      name: other.name,
      role: iAmParent ? UserRole.CHILD : UserRole.PARENT,
      avatarUrl: extras.counterpartAvatarUrl,
    },
    createdAt: family.createdAt,
  };
}
