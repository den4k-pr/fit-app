import type { IconName } from '@/shared/ui/Icon';
import type { ColorToken } from '@/theme';
import type { BodyImpact } from '@/types';

/** «Вплив на організм» (макет): системи, їхні кольори й іконки */
export const BODY_SYSTEMS: { key: keyof BodyImpact; color: ColorToken; icon: IconName }[] = [
  { key: 'muscles', color: 'bodyMuscles', icon: 'dumbbell' },
  { key: 'heart', color: 'bodyHeart', icon: 'heart' },
  { key: 'brain', color: 'bodyBrain', icon: 'brain' },
  { key: 'bones', color: 'bodyBones', icon: 'bone' },
  { key: 'energy', color: 'bodyEnergy', icon: 'zap' },
];

/** Макет: > 66 — «Сильно», > 33 — «Помітно», інакше «Помірно» */
export const impactLevel = (value: number): 'strong' | 'notable' | 'moderate' =>
  value > 66 ? 'strong' : value > 33 ? 'notable' : 'moderate';

/** Системи, на які вправа помітно впливає (> 30), — чипи в деталях вправи */
export const affectedSystems = (impact: BodyImpact | null) =>
  impact ? BODY_SYSTEMS.filter((s) => impact[s.key] > 30) : [];
