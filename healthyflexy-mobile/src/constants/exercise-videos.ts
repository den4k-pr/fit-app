/**
 * Демо-ролики вправ (assets/video, 496×864, 30 с). Каталог застосунку = рівно ці 10 вправ: кожен ролик — своя
 * вправа (вміст роликів переглянуто). У роликах є звукова доріжка — у застосунку вони ЗАВЖДИ без звуку,
 * а «вдих / видих» проговорює голосовий помічник мовою застосунку.
 * Постери (assets/video/posters) — кадр із того самого ролика: легкі мініатюри для списків.
 */
const VIDEOS: Record<string, number> = {
  squat: require('../../assets/video/final_squat_v19 (1).mp4'),
  'push-up': require('../../assets/video/final_pushup_v10 (1).mp4'),
  'forward-lunge': require('../../assets/video/final_lunge30 (1).mp4'),
  'wall-sit': require('../../assets/video/final_mux (1).mp4'),
  plank: require('../../assets/video/final_plank30.mp4'),
  crunch: require('../../assets/video/final_crunch30 (1).mp4'),
  'mountain-climber': require('../../assets/video/final_climber30.mp4'),
  'jumping-jacks': require('../../assets/video/final_jacks_v12.mp4'),
  'high-knees': require('../../assets/video/final_knees_v4.mp4'),
  burpee: require('../../assets/video/final_burpee30.mp4'),
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
