/**
 * Вид навантаження (макет «План → Види навантаження»). Вправа каталогу має 1+ видів;
 * дитина обирає, які види входять у день батька/матері, — вправи інших видів у день не потрапляють.
 */
export enum WorkoutType {
  STRENGTH = 'strength',
  CARDIO = 'cardio',
  MORNING = 'morning',
  STRETCH = 'stretch',
  WARMUP = 'warmup',
  BREATHING = 'breathing',
  WALKING = 'walking',
  MEDITATION = 'meditation',
  COORDINATION = 'coordination',
}

export const ALL_WORKOUT_TYPES: WorkoutType[] = Object.values(WorkoutType);
