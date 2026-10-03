import texts from './app-texts.json';

export type Lang = 'uk' | 'ru' | 'pl' | 'en';
export const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'uk', label: 'Украинский', flag: '🇺🇦' },
  { id: 'ru', label: 'Русский', flag: '🌐' },
  { id: 'pl', label: 'Польский', flag: '🇵🇱' },
  { id: 'en', label: 'Английский', flag: '🇬🇧' },
];

export const DEFAULT_TEXTS = texts as Record<Lang, Record<string, string>>;

export type PreviewKind = 'slides' | 'consent' | 'role' | 'form' | 'waiting' | 'plan' | 'today' | 'reward' | 'list';

export interface ScreenSection {
  id: string;
  title: string;
  description: string;
  emoji: string;
  preview: PreviewKind;
  /** Ключі тексту — усі, що починаються з цих префіксів */
  prefixes: string[];
}

/** Етапи онбордингу та ключові екрани, тексти яких можна змінити з CRM */
export const SCREEN_SECTIONS: ScreenSection[] = [
  {
    id: 'welcome',
    title: 'Приветственные слайды',
    description: 'Первое, что видит человек после установки: 4 слайда и кнопки «Начать» / «Пропустить».',
    emoji: '👋',
    preview: 'slides',
    prefixes: ['onboarding.'],
  },
  {
    id: 'consent',
    title: 'Согласие и дисклеймер',
    description: 'Экран «Прежде чем начать»: условия, медицинское предупреждение, кнопка согласия.',
    emoji: '🛡️',
    preview: 'consent',
    prefixes: ['consent.', 'disclaimer.'],
  },
  {
    id: 'login',
    title: 'Вход',
    description: 'Номер телефона или почта, код подтверждения.',
    emoji: '🔑',
    preview: 'form',
    prefixes: ['auth.method.', 'auth.phone.', 'auth.email.', 'auth.otp.', 'auth.country.', 'auth.help.', 'auth.step.'],
  },
  {
    id: 'role',
    title: 'Выбор роли',
    description: '«Кто вы?» — родитель или ребенок.',
    emoji: '🧑‍🤝‍🧑',
    preview: 'role',
    prefixes: ['auth.role.'],
  },
  {
    id: 'profile',
    title: 'Профиль',
    description: 'Имя и возраст при регистрации.',
    emoji: '🪪',
    preview: 'form',
    prefixes: ['auth.profile.'],
  },
  {
    id: 'waiting',
    title: 'Ожидание приглашения',
    description: 'Что видит родитель, пока ребенок не отправил код.',
    emoji: '⏳',
    preview: 'waiting',
    prefixes: ['auth.waiting.', 'auth.join.'],
  },
  {
    id: 'firstPlan',
    title: 'Первый план',
    description: 'Последний шаг онбординга ребенка: дни занятий и вознаграждение.',
    emoji: '🗓️',
    preview: 'plan',
    prefixes: ['firstPlan.'],
  },
  {
    id: 'invite',
    title: 'Приглашение',
    description: 'Создание и отправка кода приглашения родителям.',
    emoji: '💌',
    preview: 'list',
    prefixes: ['invite.'],
  },
  {
    id: 'today',
    title: 'Экран «Сегодня»',
    description: 'Главный экран родителей: приветствие, баннер заработка, список упражнений.',
    emoji: '☀️',
    preview: 'today',
    prefixes: ['today.'],
  },
  {
    id: 'reward',
    title: 'Награда за день',
    description: 'Праздничный экран после выполнения всех упражнений.',
    emoji: '🏆',
    preview: 'reward',
    prefixes: ['reward.'],
  },
];

export function keysOf(section: ScreenSection): string[] {
  return Object.keys(DEFAULT_TEXTS.uk).filter((k) => section.prefixes.some((p) => k.startsWith(p)));
}

const WORDS: Record<string, string> = {
  title: 'Заголовок',
  body: 'Текст',
  hint: 'Подсказка',
  start: 'Кнопка «Начать»',
  skip: 'Кнопка «Пропустить»',
  next: 'Кнопка «Далее»',
  accept: 'Кнопка согласия',
  send: 'Кнопка отправки',
  submit: 'Кнопка подтверждения',
  verify: 'Кнопка подтверждения',
  intro: 'Вступление',
  footer: 'Примечание внизу',
  warning: 'Предупреждение',
  description: 'Описание',
  label: 'Подпись',
  name: 'Поле «Имя»',
  age: 'Поле «Возраст»',
  parent: 'Вариант «Родитель»',
  child: 'Вариант «Ребенок»',
  parentHint: 'Подсказка для родителей',
  childHint: 'Подсказка для ребенка',
  short: 'Короткий дисклеймер',
  section: 'Название раздела',
  message: 'Сообщение для отправки',
};

/** Зрозуміла назва поля: «slide2.title» → «Слайд 2 · Заголовок» */
export function labelOf(key: string, section: ScreenSection): string {
  let rest = key;
  for (const p of section.prefixes) if (key.startsWith(p)) rest = key.slice(p.length);
  const parts = rest.split('.');
  return parts
    .map((part) => {
      const slide = /^slide(\d)$/.exec(part);
      if (slide) return `Слайд ${slide[1]}`;
      return WORDS[part] ?? part.replace(/([A-Z])/g, ' $1').toLowerCase();
    })
    .join(' · ');
}
