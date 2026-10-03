/**
 * Дизайн-токени з макета «index.html» («Книжка заботы»):
 * глибокий зелений (forest) + м'який зелений акцент (green) + білий папір; золото — лише для грошей.
 * Один шрифт на весь застосунок — Montserrat (заголовки 700–800, текст 400–600).
 * Стилі компонентів беруть значення ЛИШЕ звідси — жодних «сирих» кольорів і розмірів у компонентах.
 */

/** Глобальний множник розміру тексту. Макет має 13–15 pt; ТЗ §17 вимагає ≈ 18 pt для 50+ → 1.2 дає 16–18 pt. Повернути макет: 1. */
export const TYPE_SCALE = 1.2;
const s = (size: number) => Math.round(size * TYPE_SCALE);

export const colors = {
  // темні поверхні (шапка, таб-бар, плитки статистики)
  forest: '#17593A',
  deep: '#23784D',
  line: 'rgba(255, 255, 255, 0.15)',
  // світлі поверхні
  /** фон екранів — ледь теплий зелено-білий, щоб білі картки «сиділи» на ньому м'якше */
  paper: '#F7FAF8',
  shade: '#F5FAF7',
  border: '#DCEBE1',
  surface: '#FFFFFF',
  cream: '#E9F6EE',
  white: '#FFFFFF',
  black: '#000000',
  // текст
  ink: '#16271D',
  soft: '#46664F',
  muted: '#7E9E88',
  mutedOnDark: 'rgba(255, 255, 255, 0.6)',
  mint: '#BDF2D2',
  // основний акцент (кнопки, перемикачі, прогрес)
  green: '#33B26E',
  greenDark: '#25925A',
  /** фон головних кнопок: той самий зелений, трохи глибший — білий текст читається (контраст ≥ 3:1) */
  greenButton: '#2A9D62',
  greenButtonBase: '#1F8350',
  greenLight: '#E9F6EE',
  greenBorder: '#B9E0C7',
  // золото — гроші, фонд, винагорода
  gold: '#C9962B',
  goldDark: '#9C7420',
  goldSoft: '#EBD9A4',
  goldBright: '#F0C040',
  onGold: '#FFFFFF',
  // «teal» зі старого макета тепер — темний зелений (позитивні стани, посилання)
  teal: '#25925A',
  tealBg: '#E9F6EE',
  tealBorder: '#B9E0C7',
  red: '#B5473A',
  redBg: '#FDF0EF',
  redBorder: '#F0CFC2',
  // піґулки та банери
  pillGreenText: '#17593A',
  pillGoldBg: '#FDF4E3',
  pillGoldText: '#633806',
  pillGoldBorder: '#EDD9A3',
  // категорії вправ
  categoryStrength: '#E9F6EE',
  categoryCardio: '#FAECE7',
  categoryBalance: '#EEEDFE',
  categoryBreathing: '#E6F1FB',
  categoryJointMobility: '#FDF0E3',
  categoryStretch: '#F1F7E6',
  overlay: 'rgba(14, 32, 22, 0.5)',
  // «Вплив на організм» (макет): м'язи, серце, мозок, кістки, енергія
  bodyMuscles: '#33B26E',
  bodyHeart: '#E24B4A',
  bodyBrain: '#7F77DD',
  bodyBones: '#378ADD',
  bodyEnergy: '#EF9F27',
  // банер «ще не займалася сьогодні» (макет: помаранчевий)
  warnBg: '#FFF3E0',
  warnBorder: '#FFB74D',
  warnText: '#BF360C',
  warnStrong: '#E65100',
  warnButton: '#FF6F00',
} as const;
export type ColorToken = keyof typeof colors;

export const fonts = {
  sans: 'Montserrat_400Regular',
  sansMedium: 'Montserrat_500Medium',
  sansSemiBold: 'Montserrat_600SemiBold',
  sansBold: 'Montserrat_700Bold',
  /** Заголовки й великі числа */
  heading: 'Montserrat_800ExtraBold',
  /** Колишні «серифні» заголовки — тепер той самий Montserrat (один шрифт на застосунок) */
  serifBold: 'Montserrat_700Bold',
  /** Підписи секцій, таймери, коди — Montserrat із розрідженням замість моноширинного */
  mono: 'Montserrat_500Medium',
  monoMedium: 'Montserrat_600SemiBold',
} as const;

/** Montserrat ширший за Inter: трохи щільніший трекінг заголовків і повітряніші інтерліньяжі */
export const typography = {
  h1: { fontFamily: fonts.heading, fontSize: s(26), lineHeight: s(33), letterSpacing: -0.4 },
  h2: { fontFamily: fonts.sansBold, fontSize: s(20), lineHeight: s(27), letterSpacing: -0.2 },
  h3: { fontFamily: fonts.sansBold, fontSize: s(15), lineHeight: s(22) },
  body: { fontFamily: fonts.sans, fontSize: s(14), lineHeight: s(22) },
  bodyMedium: { fontFamily: fonts.sansMedium, fontSize: s(13.5), lineHeight: s(20) },
  bodyStrong: { fontFamily: fonts.sansSemiBold, fontSize: s(14), lineHeight: s(21) },
  small: { fontFamily: fonts.sans, fontSize: s(12.5), lineHeight: s(19) },
  smallStrong: { fontFamily: fonts.sansSemiBold, fontSize: s(12.5), lineHeight: s(19) },
  caption: { fontFamily: fonts.sans, fontSize: s(11.5), lineHeight: s(17) },
  captionStrong: { fontFamily: fonts.sansSemiBold, fontSize: s(11.5), lineHeight: s(17) },
  micro: { fontFamily: fonts.sansSemiBold, fontSize: s(9.5), lineHeight: s(14) },
  statNumber: { fontFamily: fonts.heading, fontSize: s(22), lineHeight: s(29), letterSpacing: -0.3 },
  bigNumber: { fontFamily: fonts.heading, fontSize: s(30), lineHeight: s(37), letterSpacing: -0.6 },
  timer: { fontFamily: fonts.heading, fontSize: s(52), lineHeight: s(60), letterSpacing: -1.5 },
  button: { fontFamily: fonts.sansBold, fontSize: s(14.5), lineHeight: s(20), letterSpacing: 0.1 },
  buttonSmall: { fontFamily: fonts.sansBold, fontSize: s(12.5), lineHeight: s(18), letterSpacing: 0.1 },
  mono: { fontFamily: fonts.monoMedium, fontSize: s(11.5), lineHeight: s(17), letterSpacing: 0.3 },
  sectionLabel: { fontFamily: fonts.sansBold, fontSize: s(9.5), lineHeight: s(14), letterSpacing: 1.4 },
} as const;
export type TextVariant = keyof typeof typography;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export type SpacingToken = keyof typeof spacing;

export const radius = { sm: 10, md: 13, lg: 18, xl: 26, pill: 999 } as const;

/** Макет: `.card` має відступ 16 з боків і 12 знизу */
export const layout = {
  screenPadding: 16,
  cardGap: 12,
  tabBarHeight: 62,
  topBarHeight: 44,
  buttonHeight: 56,
  hitTarget: 48,
} as const;

export const borderWidth = { hairline: 1, thin: 1, medium: 1.5 } as const;

/** Легкі тіні макета (`.card`: 0 1px 3px rgba(0,0,0,.04)); `button` — «об'ємний» низ зеленої кнопки */
export const shadows = {
  card: { shadowColor: '#17593A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 1 },
  raised: { shadowColor: '#17593A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 6 },
  button: { shadowColor: '#33B26E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 3 },
  gold: { shadowColor: '#C9962B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 },
  none: { shadowColor: 'transparent', shadowOpacity: 0, elevation: 0 },
} as const;

/** Тривалості анімацій, мс: плавні, без різкості (інтерфейс для 50+ має «дихати», а не «літати») */
export const motion = { fast: 180, base: 320, slow: 520, stagger: 60 } as const;
