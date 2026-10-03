/**
 * Демо-ролики вправ (assets/video, 496×864, 30 с). Каталог застосунку = рівно ці 10 вправ: кожен ролик — своя
 * вправа (вміст роликів переглянуто). У роликах є звукова доріжка — у застосунку вони ЗАВЖДИ без звуку,
 * а «вдих / видих» проговорює голосовий помічник мовою застосунку.
 * Постери (assets/video/posters) — кадр із того самого ролика: легкі мініатюри для списків.
 *
 * Назва файлу = slug вправи (латиниця; дефіс у складених назвах):
 * squat · push-up · forward-lunge · wall-sit · plank · crunch · mountain-climber · jumping-jacks ·
 * high-knees · burpee.
 */
const VIDEOS: Record<string, number> = {
  squat: require('../../assets/video/squat.mp4'),
  'push-up': require('../../assets/video/push-up.mp4'),
  'forward-lunge': require('../../assets/video/forward-lunge.mp4'),
  'wall-sit': require('../../assets/video/wall-sit.mp4'),
  plank: require('../../assets/video/plank.mp4'),
  crunch: require('../../assets/video/crunch.mp4'),
  'mountain-climber': require('../../assets/video/mountain-climber.mp4'),
  'jumping-jacks': require('../../assets/video/jumping-jacks.mp4'),
  'high-knees': require('../../assets/video/high-knees.mp4'),
  burpee: require('../../assets/video/burpee.mp4'),
};

const POSTERS: Record<string, number> = {
  squat: require('../../assets/video/posters/squat.jpg'),
  'push-up': require('../../assets/video/posters/push-up.jpg'),
  'forward-lunge': require('../../assets/video/posters/forward-lunge.jpg'),
  'wall-sit': require('../../assets/video/posters/wall-sit.jpg'),
  plank: require('../../assets/video/posters/plank.jpg'),
  crunch: require('../../assets/video/posters/crunch.jpg'),
  'mountain-climber': require('../../assets/video/posters/mountain-climber.jpg'),
  'jumping-jacks': require('../../assets/video/posters/jumping-jacks.jpg'),
  'high-knees': require('../../assets/video/posters/high-knees.jpg'),
  burpee: require('../../assets/video/posters/burpee.jpg'),
};

/** Пропорції роликів (ширина / висота) */
export const EXERCISE_VIDEO_RATIO = 496 / 864;

export function getExerciseVideo(slug: string): number | undefined {
  return VIDEOS[slug];
}

/** Кадр-постер ролика (мініатюра в списках) */
export function getExercisePoster(slug: string): number | undefined {
  return POSTERS[slug];
}
