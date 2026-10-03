import { AppLanguage, ProgramDurationType } from '../../common/enums';
import { LocalizedText } from '../../common/types';

export interface ProgramSeedExercise {
  /** slug з ELDERLY_EXERCISES_SEED/EXERCISES_SEED — резолвиться в exerciseId сідером */
  exerciseSlug: string;
  targetReps?: number;
  targetSeconds?: number;
  targetSteps?: number;
  planDays: number[];
}

export interface ProgramSeed {
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Список переваг/вмісту для екрана деталей програми (2-5 пунктів) */
  highlights: LocalizedText[];
  durationType: ProgramDurationType;
  exercises: ProgramSeedExercise[];
  /** Застарілий пресет: схований з каталогу (сім'ї, яким його призначено, продовжують) */
  archived?: boolean;
}

const L = AppLanguage;
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const T = (uk: string, ru: string, pl: string, en: string): LocalizedText => ({
  [L.UK]: uk,
  [L.RU]: ru,
  [L.PL]: pl,
  [L.EN]: en,
});
const MWF = [1, 3, 5];
const TTS = [2, 4, 6];

export const PROGRAMS_SEED: ProgramSeed[] = [
  {
    slug: 'gentle-start-1-week',
    archived: true,
    name: {
      [L.UK]: 'Легкий старт: 1 тиждень',
      [L.PL]: 'Łagodny start: 1 tydzień',
      [L.EN]: 'Gentle start: 1 week',
      [L.RU]: 'Легкий старт: 1 неделя',
    },
    description: {
      [L.UK]:
        'Найпростіші й найбезпечніші вправи для першого тижня — сидячи на стільці, без обтяжень.',
      [L.PL]:
        'Najprostsze i najbezpieczniejsze ćwiczenia na pierwszy tydzień — siedząc na krześle, bez obciążeń.',
      [L.EN]: 'The simplest, safest exercises for the first week — seated, no equipment.',
      [L.RU]:
        'Самые простые и безопасные упражнения на первую неделю — сидя на стуле, без нагрузок.',
    },
    highlights: [
      {
        [L.UK]: '4 прості вправи сидячи на стільці',
        [L.PL]: '4 proste ćwiczenia siedząc na krześle',
        [L.EN]: '4 simple seated exercises',
        [L.RU]: '4 простых упражнения сидя на стуле',
      },
      {
        [L.UK]: 'Не потребує жодного інвентарю',
        [L.PL]: 'Nie wymaga żadnego sprzętu',
        [L.EN]: 'No equipment needed',
        [L.RU]: 'Не требует никакого инвентаря',
      },
      {
        [L.UK]: 'Ідеально для першого тижня занять',
        [L.PL]: 'Idealny na pierwszy tydzień ćwiczeń',
        [L.EN]: 'Perfect for the first week of training',
        [L.RU]: 'Идеально для первой недели занятий',
      },
      {
        [L.UK]: 'Безпечно навіть при обмеженій рухливості',
        [L.PL]: 'Bezpieczne nawet przy ograniczonej mobilności',
        [L.EN]: 'Safe even with limited mobility',
        [L.RU]: 'Безопасно даже при ограниченной подвижности',
      },
    ],
    durationType: ProgramDurationType.WEEK,
    exercises: [
      { exerciseSlug: 'chair-seated-marches', planDays: ALL_DAYS },
      { exerciseSlug: 'chair-sit-to-stand', targetReps: 6, planDays: ALL_DAYS },
      { exerciseSlug: 'shoulder-rolls', planDays: ALL_DAYS },
      { exerciseSlug: 'ankle-circles', planDays: ALL_DAYS },
    ],
  },
  {
    slug: 'flexibility-balance-1-month',
    archived: true,
    name: {
      [L.UK]: 'Гнучкість та баланс: 1 місяць',
      [L.PL]: 'Elastyczność i równowaga: 1 miesiąc',
      [L.EN]: 'Flexibility & balance: 1 month',
      [L.RU]: 'Гибкость и баланс: 1 месяц',
    },
    description: {
      [L.UK]:
        'Ширший набір на місяць: суглобова гімнастика, розтяжка й вправи на баланс біля стіни.',
      [L.PL]:
        'Szerszy zestaw na miesiąc: gimnastyka stawowa, rozciąganie i ćwiczenia równowagi przy ścianie.',
      [L.EN]: 'A broader month-long set: joint mobility, stretching, and wall balance exercises.',
      [L.RU]:
        'Более широкий набор на месяц: суставная гимнастика, растяжка и упражнения на баланс у стены.',
    },
    highlights: [
      {
        [L.UK]: '8 вправ: суглобова гімнастика, розтяжка, баланс, прогулянка',
        [L.PL]: '8 ćwiczeń: gimnastyka stawowa, rozciąganie, równowaga, spacer',
        [L.EN]: '8 exercises: joint mobility, stretching, balance, walking',
        [L.RU]: '8 упражнений: суставная гимнастика, растяжка, баланс, прогулка',
      },
      {
        [L.UK]: 'Розклад на місяць із поступовим навантаженням',
        [L.PL]: 'Harmonogram na miesiąc ze stopniowym obciążeniem',
        [L.EN]: 'A month-long schedule with gradually building intensity',
        [L.RU]: 'Расписание на месяц с постепенной нагрузкой',
      },
      {
        [L.UK]: 'Вправи біля стіни для тренування рівноваги',
        [L.PL]: 'Ćwiczenia przy ścianie trenujące równowagę',
        [L.EN]: 'Wall exercises that train balance',
        [L.RU]: 'Упражнения у стены для тренировки равновесия',
      },
      {
        [L.UK]: 'Знижує ризик падінь',
        [L.PL]: 'Zmniejsza ryzyko upadków',
        [L.EN]: 'Lowers the risk of falls',
        [L.RU]: 'Снижает риск падений',
      },
    ],
    durationType: ProgramDurationType.MONTH,
    exercises: [
      { exerciseSlug: 'chair-seated-marches', planDays: [1, 3, 5] },
      { exerciseSlug: 'chair-sit-to-stand', targetReps: 8, planDays: [1, 3, 5] },
      { exerciseSlug: 'shoulder-rolls', planDays: [1, 2, 4, 6] },
      { exerciseSlug: 'neck-stretch', planDays: [1, 2, 4, 6] },
      { exerciseSlug: 'ankle-circles', planDays: [1, 2, 4, 6] },
      { exerciseSlug: 'wall-push-ups', planDays: [2, 4, 6] },
      { exerciseSlug: 'wall-calf-raises', targetReps: 10, planDays: [2, 4, 6] },
      { exerciseSlug: 'walk-steps', targetSteps: 1000, planDays: [1, 3, 5, 7] },
    ],
  },
];

/**
 * Основні пресети для дорослих, які нормально рухаються. Вправи з групою різновидів (присідання, випади,
 * віджимання, кор…) чергуються день у день автоматично — у програмі вказано лише «базову» вправу групи.
 */
export const FITNESS_PROGRAMS_SEED: ProgramSeed[] = [
  {
    slug: 'energy-start-1-week',
    name: T(
      'Бадьорий старт: 1 тиждень',
      'Бодрый старт: 1 неделя',
      'Energiczny start: 1 tydzień',
      'Energy start: 1 week',
    ),
    description: T(
      'Повноцінне тренування на все тіло за 15–20 хвилин: розминка, ноги, руки, прес і трохи кардіо. Вправи щодня змінюються.',
      'Полноценная тренировка на все тело за 15–20 минут: разминка, ноги, руки, пресс и немного кардио. Упражнения каждый день меняются.',
      'Pełny trening całego ciała w 15–20 minut: rozgrzewka, nogi, ręce, brzuch i trochę cardio. Ćwiczenia zmieniają się codziennie.',
      'A full-body workout in 15–20 minutes: warm-up, legs, arms, core and a little cardio. Exercises change every day.',
    ),
    highlights: [
      T(
        'Усе тіло за 15–20 хвилин',
        'Все тело за 15–20 минут',
        'Całe ciało w 15–20 minut',
        'Whole body in 15–20 minutes',
      ),
      T(
        'Вправи чергуються — не набридає',
        'Упражнения чередуются — не надоедает',
        'Ćwiczenia się zmieniają — nie nudzi się',
        'Exercises rotate — never boring',
      ),
      T(
        'Без інвентарю, вдома',
        'Без инвентаря, дома',
        'Bez sprzętu, w domu',
        'No equipment, at home',
      ),
      T(
        'Ідеально для першого тижня',
        'Идеально для первой недели',
        'Idealny na pierwszy tydzień',
        'Perfect for the first week',
      ),
    ],
    durationType: ProgramDurationType.WEEK,
    exercises: [
      { exerciseSlug: 'arm-circles', planDays: ALL_DAYS },
      { exerciseSlug: 'squat', planDays: ALL_DAYS },
      { exerciseSlug: 'incline-push-up', planDays: ALL_DAYS },
      { exerciseSlug: 'glute-bridge', planDays: ALL_DAYS },
      { exerciseSlug: 'step-jacks', planDays: ALL_DAYS },
      { exerciseSlug: 'plank', targetSeconds: 20, planDays: ALL_DAYS },
      { exerciseSlug: 'side-bends', planDays: ALL_DAYS },
      { exerciseSlug: 'walk-steps', targetSteps: 1500, planDays: ALL_DAYS },
    ],
  },
  {
    slug: 'strength-tone-1-month',
    name: T(
      'Сила й тонус: 1 місяць',
      'Сила и тонус: 1 месяц',
      'Siła i tonus: 1 miesiąc',
      'Strength & tone: 1 month',
    ),
    description: T(
      'Силова програма на місяць: ноги, сідниці, груди, руки й прес. Навантаження поступово зростає, різновиди вправ змінюються щодня.',
      'Силовая программа на месяц: ноги, ягодицы, грудь, руки и пресс. Нагрузка постепенно растет, разновидности упражнений меняются каждый день.',
      'Program siłowy na miesiąc: nogi, pośladki, klatka, ręce i brzuch. Obciążenie stopniowo rośnie, warianty ćwiczeń zmieniają się codziennie.',
      'A month-long strength plan: legs, glutes, chest, arms and core. The load grows gradually and exercise variations change daily.',
    ),
    highlights: [
      T(
        'Сильні ноги, руки й прес',
        'Сильные ноги, руки и пресс',
        'Silne nogi, ręce i brzuch',
        'Strong legs, arms and core',
      ),
      T(
        'Присідання, випади, віджимання, планка',
        'Приседания, выпады, отжимания, планка',
        'Przysiady, wykroki, pompki, deska',
        'Squats, lunges, push-ups, plank',
      ),
      T(
        'Рівна спина й гарна постава',
        'Прямая спина и хорошая осанка',
        'Proste plecy i dobra postawa',
        'A straight back and good posture',
      ),
      T(
        '4–5 тренувань на тиждень',
        '4–5 тренировок в неделю',
        '4–5 treningów w tygodniu',
        '4–5 workouts a week',
      ),
    ],
    durationType: ProgramDurationType.MONTH,
    exercises: [
      { exerciseSlug: 'torso-twists', planDays: ALL_DAYS },
      { exerciseSlug: 'squat', targetReps: 18, planDays: MWF },
      { exerciseSlug: 'reverse-lunge', planDays: TTS },
      { exerciseSlug: 'knee-push-up', planDays: ALL_DAYS },
      { exerciseSlug: 'glute-bridge', targetReps: 18, planDays: MWF },
      { exerciseSlug: 'superman', planDays: TTS },
      { exerciseSlug: 'plank', targetSeconds: 30, planDays: ALL_DAYS },
      { exerciseSlug: 'forward-fold', planDays: ALL_DAYS },
      { exerciseSlug: 'walk-steps', targetSteps: 2000, planDays: [7] },
    ],
  },
  {
    slug: 'cardio-endurance-1-month',
    name: T(
      'Кардіо й витривалість: 1 місяць',
      'Кардио и выносливость: 1 месяц',
      'Cardio i wytrzymałość: 1 miesiąc',
      'Cardio & endurance: 1 month',
    ),
    description: T(
      'Для серця й енергії: кардіо-вправи, робота ніг і щоденна ходьба. Після місяця — більше сил і легше дихання на сходах.',
      'Для сердца и энергии: кардио-упражнения, работа ног и ежедневная ходьба. Через месяц — больше сил и легче дыхание на лестнице.',
      'Dla serca i energii: ćwiczenia cardio, praca nóg i codzienny spacer. Po miesiącu — więcej siły i lżejszy oddech na schodach.',
      'For your heart and energy: cardio moves, leg work and a daily walk. After a month — more energy and easier breathing on the stairs.',
    ),
    highlights: [
      T(
        'Тренує серце й витривалість',
        'Тренирует сердце и выносливость',
        'Trenuje serce i wytrzymałość',
        'Trains heart and stamina',
      ),
      T(
        'Щоденна ходьба з крокоміром',
        'Ежедневная ходьба с шагомером',
        'Codzienny spacer z krokomierzem',
        'Daily walk with the step counter',
      ),
      T(
        'Є варіанти без стрибків',
        'Есть варианты без прыжков',
        'Są warianty bez skoków',
        'Low-impact options included',
      ),
    ],
    durationType: ProgramDurationType.MONTH,
    exercises: [
      { exerciseSlug: 'hip-circles', planDays: ALL_DAYS },
      { exerciseSlug: 'jumping-jacks', planDays: ALL_DAYS },
      { exerciseSlug: 'squat', planDays: MWF },
      { exerciseSlug: 'side-lunge', planDays: TTS },
      { exerciseSlug: 'high-knees', planDays: ALL_DAYS },
      { exerciseSlug: 'single-leg-stand', planDays: ALL_DAYS },
      { exerciseSlug: 'breathing', planDays: ALL_DAYS },
      { exerciseSlug: 'walk-steps', targetSteps: 3000, planDays: ALL_DAYS },
    ],
  },
  {
    slug: 'mobility-balance-1-month',
    name: T(
      'Гнучкість і баланс: 1 місяць',
      'Гибкость и баланс: 1 месяц',
      'Gibkość i równowaga: 1 miesiąc',
      'Mobility & balance: 1 month',
    ),
    description: T(
      'Суглоби, розтяжка й рівновага: ранкова програма, що повертає легкість рухів і знімає напругу в спині.',
      'Суставы, растяжка и равновесие: утренняя программа, которая возвращает легкость движений и снимает напряжение в спине.',
      'Stawy, rozciąganie i równowaga: poranny program, który przywraca lekkość ruchu i rozluźnia plecy.',
      'Joints, stretching and balance: a morning routine that brings back easy movement and relieves back tension.',
    ),
    highlights: [
      T(
        'Гнучка спина й рухливі суглоби',
        'Гибкая спина и подвижные суставы',
        'Giętkie plecy i ruchome stawy',
        'A flexible back and mobile joints',
      ),
      T('Тренування рівноваги', 'Тренировка равновесия', 'Trening równowagi', 'Balance training'),
      T(
        'М’яке навантаження, ідеально зранку',
        'Мягкая нагрузка, идеально утром',
        'Łagodny wysiłek, idealny rano',
        'Gentle load, perfect in the morning',
      ),
    ],
    durationType: ProgramDurationType.MONTH,
    exercises: [
      { exerciseSlug: 'shoulder-rolls', planDays: ALL_DAYS },
      { exerciseSlug: 'torso-twists', planDays: ALL_DAYS },
      { exerciseSlug: 'side-bends', planDays: ALL_DAYS },
      { exerciseSlug: 'bird-dog', planDays: ALL_DAYS },
      { exerciseSlug: 'single-leg-stand', planDays: ALL_DAYS },
      { exerciseSlug: 'good-morning', planDays: MWF },
      { exerciseSlug: 'calf-raise', targetReps: 15, planDays: TTS },
      { exerciseSlug: 'breathing', planDays: ALL_DAYS },
      { exerciseSlug: 'walk-steps', targetSteps: 1500, planDays: ALL_DAYS },
    ],
  },
];
