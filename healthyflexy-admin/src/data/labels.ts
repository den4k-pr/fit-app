export const CATEGORIES: { id: string; label: string; emoji: string; color: string }[] = [
  { id: 'strength', label: 'Сила', emoji: '💪', color: '#E9F6EE' },
  { id: 'cardio', label: 'Кардио', emoji: '❤️', color: '#FAECE7' },
  { id: 'balance', label: 'Равновесие', emoji: '🧘', color: '#EEEDFE' },
  { id: 'breathing', label: 'Дыхание', emoji: '🌬️', color: '#E6F1FB' },
  { id: 'joint_mobility', label: 'Суставы', emoji: '🦴', color: '#FDF0E3' },
  { id: 'stretch', label: 'Растяжка', emoji: '🤸', color: '#F1F7E6' },
];
export const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];

export const WORKOUT_TYPES: { id: string; label: string }[] = [
  { id: 'strength', label: 'Силовые' },
  { id: 'cardio', label: 'Кардио' },
  { id: 'morning', label: 'Утренняя зарядка' },
  { id: 'stretch', label: 'Растяжка' },
  { id: 'warmup', label: 'Разминка' },
  { id: 'breathing', label: 'Дыхательные' },
  { id: 'walking', label: 'Ходьба' },
  { id: 'meditation', label: 'Медитация' },
  { id: 'coordination', label: 'Координация' },
];

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** Ритм голосового помощника: что проговаривает приложение во время упражнения */
export const VOICE_PATTERNS: { id: string; label: string; example: string }[] = [
  { id: 'squat', label: 'Приседания', example: '«Вниз» — «1», «Вниз» — «2»…' },
  { id: 'lunge', label: 'Выпады', example: '«Шаг и вниз» — «1»…' },
  { id: 'push', label: 'Отжимания', example: '«Опускаемся» — «1»…' },
  { id: 'bridge', label: 'Мостик', example: '«Таз вверх» — «1»…' },
  { id: 'raise', label: 'Подъемы', example: '«Поднимаем» — «1»…' },
  { id: 'reach', label: 'Вытяжения', example: '«Тянемся» — «1»…' },
  { id: 'twist', label: 'Повороты / наклоны в стороны', example: '«Влево» — «1»…' },
  { id: 'fold', label: 'Наклоны вперед', example: '«Наклон» — «1»…' },
  { id: 'march', label: 'Марш / бег на месте', example: '«Колени выше!», «Половина!», отсчет' },
  { id: 'jacks', label: 'Прыжки «звездочка»', example: '«Руки до конца вверх!», «Половина!»' },
  { id: 'circle', label: 'Круги', example: '«Круги шире!», «Меняем направление!»' },
  { id: 'hold', label: 'Удержание (планка, баланс)', example: '«Держим положение», «Осталось 10 секунд»' },
  { id: 'breath', label: 'Дыхание', example: '«Вдох» — «Выдох»' },
  { id: 'steps', label: 'Шагомер', example: '«Осталось 500 шагов»' },
];
export const voiceLabel = (id: string | null) => VOICE_PATTERNS.find((v) => v.id === id)?.label ?? 'По категории';

export const BODY_IMPACT: { id: 'muscles' | 'heart' | 'brain' | 'bones' | 'energy'; label: string; color: string }[] = [
  { id: 'muscles', label: 'Мышцы', color: '#33B26E' },
  { id: 'heart', label: 'Сердце', color: '#E24B4A' },
  { id: 'brain', label: 'Мозг', color: '#7F77DD' },
  { id: 'bones', label: 'Кости', color: '#378ADD' },
  { id: 'energy', label: 'Энергия', color: '#EF9F27' },
];

export const ROLE_LABEL: Record<string, string> = { parent: 'Родитель', child: 'Ребенок' };
export const LANG_LABEL: Record<string, string> = { uk: 'Украинский', ru: 'Русский', pl: 'Польский', en: 'Английский' };
export const SESSION_STATUS: Record<string, { label: string; tone: 'green' | 'gold' | 'red' | 'gray' }> = {
  completed: { label: 'Выполнено', tone: 'green' },
  in_progress: { label: 'В процессе', tone: 'gold' },
  pending: { label: 'Ожидает', tone: 'gray' },
  missed: { label: 'Пропущено', tone: 'red' },
};
