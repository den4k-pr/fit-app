/** Токени кольорів мобільного застосунку, які змінюються з CRM (дзеркало `theme/tokens.ts` застосунку) */
export const THEME_KEYS = [
  'forest',
  'deep',
  'green',
  'greenDark',
  'greenButton',
  'greenButtonBase',
  'greenLight',
  'greenBorder',
  'mint',
  'paper',
  'shade',
  'border',
  'cream',
  'teal',
  'tealBg',
  'tealBorder',
  'pillGreenText',
  'ink',
  'soft',
  'muted',
] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];
export type Palette = Record<ThemeKey, string>;

export const TOKEN_INFO: Record<ThemeKey, { label: string; hint: string; group: 'dark' | 'accent' | 'surface' | 'text' }> = {
  forest: { label: 'Основной темный', hint: 'Шапка, нижнее меню, плитки статистики', group: 'dark' },
  deep: { label: 'Темный светлее', hint: 'Градиенты и второстепенные темные элементы', group: 'dark' },
  mint: { label: 'Акцент на темном', hint: 'Числа и иконки на темном фоне', group: 'dark' },
  pillGreenText: { label: 'Текст «пилюль»', hint: 'Метки статусов', group: 'dark' },
  green: { label: 'Акцент', hint: 'Переключатели, прогресс, галочки', group: 'accent' },
  greenDark: { label: 'Акцент темнее', hint: 'Нажатые состояния, ссылки', group: 'accent' },
  greenButton: { label: 'Главная кнопка', hint: 'Фон кнопок с белым текстом', group: 'accent' },
  greenButtonBase: { label: 'Тень кнопки', hint: 'Нижний «объем» кнопки', group: 'accent' },
  teal: { label: 'Позитивные состояния', hint: 'Ссылки и успех', group: 'accent' },
  greenLight: { label: 'Светлый акцент', hint: 'Фон выбранных плиток и советов', group: 'surface' },
  greenBorder: { label: 'Рамка акцента', hint: 'Рамки выбранных плиток', group: 'surface' },
  tealBg: { label: 'Фон успеха', hint: 'Баннеры «выполнено»', group: 'surface' },
  tealBorder: { label: 'Рамка успеха', hint: 'Рамки баннеров', group: 'surface' },
  cream: { label: 'Кремовый', hint: 'Фоны карточек-подсказок', group: 'surface' },
  paper: { label: 'Фон экранов', hint: 'Общий фон приложения', group: 'surface' },
  shade: { label: 'Светлая плитка', hint: 'Второстепенные карточки', group: 'surface' },
  border: { label: 'Рамки', hint: 'Линии и рамки карточек', group: 'surface' },
  ink: { label: 'Основной текст', hint: 'Заголовки и текст', group: 'text' },
  soft: { label: 'Второстепенный текст', hint: 'Описания', group: 'text' },
  muted: { label: 'Приглушенный текст', hint: 'Подписи, даты', group: 'text' },
};

export const DEFAULT_PALETTE: Palette = {
  forest: '#17593A',
  deep: '#23784D',
  green: '#33B26E',
  greenDark: '#25925A',
  greenButton: '#2A9D62',
  greenButtonBase: '#1F8350',
  greenLight: '#E9F6EE',
  greenBorder: '#B9E0C7',
  mint: '#BDF2D2',
  paper: '#F7FAF8',
  shade: '#F5FAF7',
  border: '#DCEBE1',
  cream: '#E9F6EE',
  teal: '#25925A',
  tealBg: '#E9F6EE',
  tealBorder: '#B9E0C7',
  pillGreenText: '#17593A',
  ink: '#16271D',
  soft: '#46664F',
  muted: '#7E9E88',
};

export interface PalettePreset {
  id: string;
  name: string;
  description: string;
  /** Три базові кольори: з них автоматично виводяться всі токени */
  base: { dark: string; accent: string };
}

export const PRESETS: PalettePreset[] = [
  { id: 'forest', name: 'Лесной', description: 'Стандартная палитра приложения', base: { dark: '#17593A', accent: '#33B26E' } },
  { id: 'ocean', name: 'Океан', description: 'Спокойный синий, доверие и чистота', base: { dark: '#123F63', accent: '#2F8FD8' } },
  { id: 'lavender', name: 'Лаванда', description: 'Мягкий фиолетовый, забота', base: { dark: '#3E2E6B', accent: '#8A6AD6' } },
  { id: 'sunset', name: 'Закат', description: 'Теплый терракотовый, энергия', base: { dark: '#6B2E1F', accent: '#E0703F' } },
  { id: 'teal', name: 'Мята', description: 'Свежий бирюзовый', base: { dark: '#0F4C4C', accent: '#1FAFA0' } },
  { id: 'berry', name: 'Ягодный', description: 'Яркий малиновый', base: { dark: '#5C1633', accent: '#D6457A' } },
  { id: 'graphite', name: 'Графит', description: 'Сдержанный нейтральный', base: { dark: '#232B33', accent: '#4F8A6E' } },
];
