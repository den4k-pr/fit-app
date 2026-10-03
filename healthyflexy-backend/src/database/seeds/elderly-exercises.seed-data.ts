import { AppLanguage, ExerciseCategory, WorkoutType, VoicePattern } from '../../common/enums';
import { ExerciseSeed } from './exercises.seed-data';

/**
 * Безпечні вправи без обтяжень для літніх людей (гериатрична ЛФК): сидячи на стільці,
 * легка суглобова гімнастика, вправи біля стіни для балансу. `sortOrder` продовжує базовий
 * набір (1-4), сам порядок тут значення не має — реальний порядок дня задає ProgramExercise.
 *
 * ⚠️ Тексти узагальнені для MVP; `sourceUrl`/`sourceTitle` — верифікувати перед публікацією.
 */
const L = AppLanguage;

export const ELDERLY_EXERCISES_SEED: ExerciseSeed[] = [
  {
    slug: 'chair-seated-marches',
    sortOrder: 5,
    category: ExerciseCategory.CARDIO,
    name: {
      [L.UK]: 'Марш сидячи на стільці',
      [L.PL]: 'Marsz w pozycji siedzącej',
      [L.EN]: 'Seated marches',
      [L.RU]: 'Марш сидя на стуле',
    },
    targetReps: null,
    targetSeconds: 30,
    recordMaxSec: 45,
    demoVideoUrl: null,
    benefit: {
      [L.UK]: 'Розганяє кровообіг у ногах без навантаження на суглоби.',
      [L.PL]: 'Poprawia krążenie w nogach bez obciążania stawów.',
      [L.EN]: 'Improves leg circulation without straining the joints.',
      [L.RU]: 'Разгоняет кровообращение в ногах без нагрузки на суставы.',
    },
    description: {
      [L.UK]: 'Сидячи на стійкому стільці, по черзі піднімайте коліна, ніби крокуєте на місці.',
      [L.PL]: 'Siedząc na stabilnym krześle, na przemian unoś kolana, jakbyś maszerował w miejscu.',
      [L.EN]: 'Sitting on a stable chair, alternately lift your knees as if marching in place.',
      [L.RU]: 'Сидя на устойчивом стуле, поочередно поднимайте колени, будто шагаете на месте.',
    },
    safetyInstructions: {
      [L.UK]: 'Стілець без коліщат, спина рівна, руки можуть триматися за сидіння.',
      [L.PL]: 'Krzesło bez kółek, plecy proste, ręce mogą trzymać się siedziska.',
      [L.EN]: 'Use a chair without wheels, keep your back straight, hands may hold the seat.',
      [L.RU]: 'Стул без колесиков, спина прямая, руки могут держаться за сиденье.',
    },
    aiCriteria:
      'Person seated (chair, bed, sofa or any seat), alternately lifting knees/legs, stays seated; different legs raised in different frames.',
    sourceTitle: 'de Labra et al., BMC Geriatrics, 2015',
    sourceUrl: null,
    workoutTypes: [WorkoutType.CARDIO, WorkoutType.WARMUP, WorkoutType.MORNING],
    durationMin: 2,
    bodyImpact: { muscles: 30, heart: 70, brain: 15, bones: 10, energy: 60 },
    muscles: [
      {
        [L.UK]: 'Згиначі стегна',
        [L.PL]: 'Zginacze biodra',
        [L.EN]: 'Hip flexors',
        [L.RU]: 'Сгибатели бедра',
      },
      {
        [L.UK]: 'Квадрицепси',
        [L.PL]: 'Mięśnie czworogłowe',
        [L.EN]: 'Quadriceps',
        [L.RU]: 'Квадрицепсы',
      },
      { [L.UK]: 'Серце', [L.PL]: 'Serce', [L.EN]: 'Heart', [L.RU]: 'Сердце' },
    ],
    variantGroup: null,
    voicePattern: VoicePattern.MARCH,
    isActive: false,
  },
  {
    slug: 'chair-sit-to-stand',
    sortOrder: 6,
    category: ExerciseCategory.STRENGTH,
    name: {
      [L.UK]: 'Вставання зі стільця',
      [L.PL]: 'Wstawanie z krzesła',
      [L.EN]: 'Chair sit-to-stand',
      [L.RU]: 'Вставание со стула',
    },
    targetReps: 8,
    targetSeconds: null,
    recordMaxSec: 45,
    demoVideoUrl: null,
    benefit: {
      [L.UK]: "Зміцнює м'язи ніг і сідниць, найважливіша вправа проти падінь.",
      [L.PL]: 'Wzmacnia mięśnie nóg i pośladków — kluczowe ćwiczenie przeciw upadkom.',
      [L.EN]: 'Strengthens legs and glutes — a key fall-prevention exercise.',
      [L.RU]: 'Укрепляет мышцы ног и ягодиц — главное упражнение против падений.',
    },
    description: {
      [L.UK]:
        'Сидячи, повільно вставайте, не використовуючи руки (або спираючись легко), і сідайте назад.',
      [L.PL]:
        'Siedząc, powoli wstawaj bez pomocy rąk (lub lekko się wspierając) i usiądź z powrotem.',
      [L.EN]:
        'From sitting, slowly stand up without using your hands (or with light support), then sit back down.',
      [L.RU]:
        'Сидя, медленно вставайте, не используя руки (или слегка опираясь), и садитесь обратно.',
    },
    safetyInstructions: {
      [L.UK]:
        'Стілець стійкий, біля стіни чи столу для опори за потреби. Рухи повільні, без ривків.',
      [L.PL]:
        'Stabilne krzesło, blisko ściany lub stołu dla podparcia w razie potrzeby. Ruchy powolne, bez szarpnięć.',
      [L.EN]:
        'Use a stable chair near a wall or table for support if needed. Move slowly, no jerking.',
      [L.RU]:
        'Стул устойчивый, рядом со стеной или столом для опоры при необходимости. Движения медленные, без рывков.',
    },
    aiCriteria:
      'Person rises from sitting to standing and sits back down (from a chair, bed, sofa or any seat); frames show both sitting and standing positions.',
    sourceTitle: 'Hasegawa et al., Scientific Reports, 2021',
    sourceUrl: null,
    workoutTypes: [WorkoutType.STRENGTH],
    durationMin: 3,
    bodyImpact: { muscles: 85, heart: 35, brain: 15, bones: 70, energy: 40 },
    muscles: [
      {
        [L.UK]: 'Квадрицепси',
        [L.PL]: 'Mięśnie czworogłowe',
        [L.EN]: 'Quadriceps',
        [L.RU]: 'Квадрицепсы',
      },
      { [L.UK]: 'Сідниці', [L.PL]: 'Pośladki', [L.EN]: 'Glutes', [L.RU]: 'Ягодицы' },
      { [L.UK]: 'Прес і спина', [L.PL]: 'Brzuch i plecy', [L.EN]: 'Core', [L.RU]: 'Пресс и спина' },
    ],
    variantGroup: null,
    voicePattern: VoicePattern.SQUAT,
    isActive: false,
  },
  {
    slug: 'shoulder-rolls',
    sortOrder: 7,
    category: ExerciseCategory.JOINT_MOBILITY,
    name: {
      [L.UK]: 'Обертання плечима',
      [L.PL]: 'Krążenia ramion',
      [L.EN]: 'Shoulder rolls',
      [L.RU]: 'Вращение плечами',
    },
    targetReps: 10,
    targetSeconds: null,
    recordMaxSec: 30,
    demoVideoUrl: null,
    benefit: {
      [L.UK]: 'Знімає напругу у плечовому поясі та покращує рухливість суглобів.',
      [L.PL]: 'Rozluźnia obręcz barkową i poprawia ruchomość stawów.',
      [L.EN]: 'Releases shoulder tension and improves joint mobility.',
      [L.RU]: 'Снимает напряжение в плечевом поясе и улучшает подвижность суставов.',
    },
    description: {
      [L.UK]: 'Повільно обертайте плечима вперед, потім назад, великими плавними колами.',
      [L.PL]: 'Powoli krąż ramionami do przodu, a potem do tyłu, dużymi płynnymi kołami.',
      [L.EN]: 'Slowly roll your shoulders forward, then backward, in large smooth circles.',
      [L.RU]: 'Медленно вращайте плечами вперед, затем назад, большими плавными кругами.',
    },
    safetyInstructions: {
      [L.UK]: 'Сидячи або стоячи рівно, рухи плавні, без болю.',
      [L.PL]: 'Siedząc lub stojąc prosto, ruchy płynne, bez bólu.',
      [L.EN]: 'Sit or stand upright, move smoothly, stop if it hurts.',
      [L.RU]: 'Сидя или стоя прямо, движения плавные, без боли.',
    },
    aiCriteria:
      'Shoulders moving in a circular rolling motion, upright posture, no pain-related grimacing visible.',
    sourceTitle: 'Wu et al., Frontiers in Public Health, 2022',
    sourceUrl: null,
    workoutTypes: [WorkoutType.MORNING, WorkoutType.WARMUP],
    durationMin: 2,
    bodyImpact: { muscles: 30, heart: 15, brain: 20, bones: 20, energy: 40 },
    muscles: [
      { [L.UK]: 'Плечі', [L.PL]: 'Barki', [L.EN]: 'Shoulders', [L.RU]: 'Плечи' },
      {
        [L.UK]: 'Верх спини',
        [L.PL]: 'Górna część pleców',
        [L.EN]: 'Upper back',
        [L.RU]: 'Верх спины',
      },
      { [L.UK]: 'Шия', [L.PL]: 'Szyja', [L.EN]: 'Neck', [L.RU]: 'Шея' },
    ],
    variantGroup: 'warmup',
    voicePattern: VoicePattern.CIRCLE,
    isActive: true,
  },
  {
    slug: 'neck-stretch',
    sortOrder: 8,
    category: ExerciseCategory.STRETCH,
    name: {
      [L.UK]: 'Розтяжка шиї',
      [L.PL]: 'Rozciąganie szyi',
      [L.EN]: 'Neck stretch',
      [L.RU]: 'Растяжка шеи',
    },
    targetReps: null,
    targetSeconds: 20,
    recordMaxSec: 30,
    demoVideoUrl: null,
    benefit: {
      [L.UK]: 'Зменшує скутість шиї та верхньої частини спини.',
      [L.PL]: 'Zmniejsza sztywność szyi i górnej części pleców.',
      [L.EN]: 'Reduces stiffness in the neck and upper back.',
      [L.RU]: 'Уменьшает скованность шеи и верхней части спины.',
    },
    description: {
      [L.UK]:
        'Стоячи або сидячи рівно, повільно нахиляйте голову до одного плеча, потім до іншого, без ривків. Плечі розслаблені й опущені.',
      [L.PL]:
        'Stojąc lub siedząc prosto, powoli przechylaj głowę do jednego barku, potem do drugiego, bez szarpnięć.',
      [L.EN]:
        'Standing or sitting upright, slowly tilt your head toward one shoulder, then the other, without jerking.',
      [L.RU]:
        'Стоя или сидя прямо, медленно наклоняйте голову к одному плечу, затем к другому, без рывков. Плечи расслаблены и опущены.',
    },
    safetyInstructions: {
      [L.UK]: 'Тільки легка розтяжка до відчуття натягу, без болю. Не крутити головою різко.',
      [L.PL]:
        'Tylko lekkie rozciąganie do uczucia naciągnięcia, bez bólu. Nie kręcić głową gwałtownie.',
      [L.EN]: 'Only a gentle stretch to a feeling of tension, never pain. No sudden head turns.',
      [L.RU]: 'Только легкая растяжка до ощущения натяжения, без боли. Не крутить головой резко.',
    },
    aiCriteria:
      'Head tilting gently side to side (sitting or standing), slow controlled movement; head position differs between frames.',
    sourceTitle: 'Page, International Journal of Sports Physical Therapy, 2012',
    sourceUrl: null,
    workoutTypes: [WorkoutType.STRETCH, WorkoutType.MORNING],
    durationMin: 2,
    bodyImpact: { muscles: 20, heart: 10, brain: 30, bones: 15, energy: 30 },
    muscles: [
      { [L.UK]: 'Шия', [L.PL]: 'Szyja', [L.EN]: 'Neck', [L.RU]: 'Шея' },
      {
        [L.UK]: 'Верх спини',
        [L.PL]: 'Górna część pleców',
        [L.EN]: 'Upper back',
        [L.RU]: 'Верх спины',
      },
    ],
    variantGroup: 'warmup',
    voicePattern: VoicePattern.TWIST,
    isActive: true,
  },
  {
    slug: 'ankle-circles',
    sortOrder: 9,
    category: ExerciseCategory.JOINT_MOBILITY,
    name: {
      [L.UK]: 'Обертання стопами',
      [L.PL]: 'Krążenia stóp',
      [L.EN]: 'Ankle circles',
      [L.RU]: 'Вращение стопами',
    },
    targetReps: 10,
    targetSeconds: null,
    recordMaxSec: 30,
    demoVideoUrl: null,
    benefit: {
      [L.UK]: 'Покращує кровообіг у ногах і рухливість гомілковостопного суглоба.',
      [L.PL]: 'Poprawia krążenie w nogach i ruchomość stawu skokowego.',
      [L.EN]: 'Improves leg circulation and ankle joint mobility.',
      [L.RU]: 'Улучшает кровообращение в ногах и подвижность голеностопного сустава.',
    },
    description: {
      [L.UK]: 'Сидячи, підніміть одну ногу й обертайте стопою по колу, потім поміняйте ногу.',
      [L.PL]: 'Siedząc, unieś jedną nogę i krąż stopą w koło, następnie zmień nogę.',
      [L.EN]: 'Sitting down, lift one foot and rotate it in a circle, then switch feet.',
      [L.RU]: 'Сидя, поднимите одну ногу и вращайте стопой по кругу, затем смените ногу.',
    },
    safetyInstructions: {
      [L.UK]: 'Виконувати сидячи, стілець стійкий.',
      [L.PL]: 'Wykonywać siedząc, krzesło stabilne.',
      [L.EN]: 'Perform seated, on a stable chair.',
      [L.RU]: 'Выполнять сидя, стул устойчивый.',
    },
    aiCriteria: 'Person seated, foot lifted and rotating in circular motion at the ankle.',
    sourceTitle: 'de Labra et al., BMC Geriatrics, 2015',
    sourceUrl: null,
    workoutTypes: [WorkoutType.WARMUP, WorkoutType.MORNING, WorkoutType.COORDINATION],
    durationMin: 2,
    bodyImpact: { muscles: 25, heart: 15, brain: 20, bones: 40, energy: 25 },
    muscles: [
      { [L.UK]: 'Гомілкостопи', [L.PL]: 'Stawy skokowe', [L.EN]: 'Ankles', [L.RU]: 'Голеностопы' },
      { [L.UK]: 'Литки', [L.PL]: 'Łydki', [L.EN]: 'Calves', [L.RU]: 'Икры' },
      { [L.UK]: 'Стопи', [L.PL]: 'Stopy', [L.EN]: 'Feet', [L.RU]: 'Стопы' },
    ],
    variantGroup: null,
    voicePattern: VoicePattern.CIRCLE,
    isActive: false,
  },
  {
    slug: 'wall-push-ups',
    sortOrder: 10,
    category: ExerciseCategory.STRENGTH,
    name: {
      [L.UK]: 'Віджимання від стіни',
      [L.PL]: 'Pompki od ściany',
      [L.EN]: 'Wall push-ups',
      [L.RU]: 'Отжимания от стены',
    },
    targetReps: 8,
    targetSeconds: null,
    recordMaxSec: 45,
    demoVideoUrl: null,
    benefit: {
      [L.UK]: "Зміцнює м'язи рук і грудей без навантаження на суглоби, як звичайні віджимання.",
      [L.PL]: 'Wzmacnia mięśnie rąk i klatki piersiowej bez obciążania stawów jak zwykłe pompki.',
      [L.EN]: 'Strengthens arms and chest without the joint strain of floor push-ups.',
      [L.RU]: 'Укрепляет мышцы рук и груди без нагрузки на суставы, как обычные отжимания.',
    },
    description: {
      [L.UK]:
        'Станьте на відстані витягнутої руки від стіни, обіпріться долонями та згинайте лікті, наближаючи груди до стіни.',
      [L.PL]:
        'Stań w odległości wyciągniętej ręki od ściany, oprzyj dłonie i zginaj łokcie, zbliżając klatkę piersiową do ściany.',
      [L.EN]:
        "Stand an arm's length from a wall, place palms on it, and bend your elbows to bring your chest toward the wall.",
      [L.RU]:
        'Встаньте на расстоянии вытянутой руки от стены, обопритесь ладонями и сгибайте локти, приближая грудь к стене.',
    },
    safetyInstructions: {
      [L.UK]: 'Ноги стійко на підлозі, рух повільний, не затримувати дихання.',
      [L.PL]: 'Stopy stabilnie na podłodze, ruch powolny, nie wstrzymywać oddechu.',
      [L.EN]: 'Feet planted firmly, move slowly, do not hold your breath.',
      [L.RU]: 'Ноги устойчиво на полу, движение медленное, не задерживать дыхание.',
    },
    aiCriteria:
      'Person standing, hands on a vertical support (wall, door, wardrobe, counter), elbows bending and straightening, body leaning toward and away from the support.',
    sourceTitle: "Westcott, ACSM's Health & Fitness Journal, 2012",
    sourceUrl: null,
    workoutTypes: [WorkoutType.STRENGTH],
    durationMin: 3,
    bodyImpact: { muscles: 85, heart: 25, brain: 10, bones: 40, energy: 35 },
    muscles: [
      { [L.UK]: 'Трицепси', [L.PL]: 'Tricepsy', [L.EN]: 'Triceps', [L.RU]: 'Трицепсы' },
      { [L.UK]: 'Груди', [L.PL]: 'Klatka piersiowa', [L.EN]: 'Chest', [L.RU]: 'Грудь' },
      { [L.UK]: 'Плечі', [L.PL]: 'Barki', [L.EN]: 'Shoulders', [L.RU]: 'Плечи' },
    ],
    variantGroup: null,
    voicePattern: VoicePattern.PUSH,
    isActive: false,
  },
  {
    slug: 'wall-calf-raises',
    sortOrder: 11,
    category: ExerciseCategory.BALANCE,
    name: {
      [L.UK]: 'Підйом на носки біля стіни',
      [L.PL]: 'Wspięcia na palce przy ścianie',
      [L.EN]: 'Wall calf raises',
      [L.RU]: 'Подъем на носки у стены',
    },
    targetReps: 12,
    targetSeconds: null,
    recordMaxSec: 30,
    demoVideoUrl: null,
    benefit: {
      [L.UK]: "Тренує баланс і зміцнює литкові м'язи, знижує ризик падінь.",
      [L.PL]: 'Ćwiczy równowagę i wzmacnia mięśnie łydek, zmniejsza ryzyko upadków.',
      [L.EN]: 'Trains balance and strengthens calves, lowering fall risk.',
      [L.RU]: 'Тренирует баланс и укрепляет икроножные мышцы, снижает риск падений.',
    },
    description: {
      [L.UK]: 'Обіпріться руками на стіну, повільно підніміться на носки й опустіться назад.',
      [L.PL]: 'Oprzyj ręce o ścianę, powoli wznieś się na palce i opuść z powrotem.',
      [L.EN]:
        'Support yourself against a wall with your hands, slowly rise onto your toes and lower back down.',
      [L.RU]: 'Обопритесь руками о стену, медленно поднимитесь на носки и опуститесь обратно.',
    },
    safetyInstructions: {
      [L.UK]: "Обов'язково тримайтеся за стіну, взуття не слизьке.",
      [L.PL]: 'Koniecznie trzymaj się ściany, obuwie nieślizgające się.',
      [L.EN]: 'Always hold the wall for support, wear non-slip footwear.',
      [L.RU]: 'Обязательно держитесь за стену, обувь нескользкая.',
    },
    aiCriteria:
      'Person standing, holding any stable support (wall, chair, counter) or none, heels rising off the floor and lowering.',
    sourceTitle: 'Orr et al., Age and Ageing, 2008',
    sourceUrl: null,
    workoutTypes: [WorkoutType.COORDINATION, WorkoutType.STRENGTH],
    durationMin: 3,
    bodyImpact: { muscles: 60, heart: 20, brain: 30, bones: 65, energy: 30 },
    muscles: [
      { [L.UK]: 'Литки', [L.PL]: 'Łydki', [L.EN]: 'Calves', [L.RU]: 'Икры' },
      { [L.UK]: 'Гомілкостопи', [L.PL]: 'Stawy skokowe', [L.EN]: 'Ankles', [L.RU]: 'Голеностопы' },
    ],
    variantGroup: null,
    voicePattern: VoicePattern.RAISE,
    isActive: false,
  },
  {
    slug: 'walk-steps',
    sortOrder: 12,
    category: ExerciseCategory.CARDIO,
    name: {
      [L.UK]: 'Прогулянка: 1000 кроків',
      [L.PL]: 'Spacer: 1000 kroków',
      [L.EN]: 'Walk: 1,000 steps',
      [L.RU]: 'Прогулка: 1000 шагов',
    },
    targetReps: null,
    targetSeconds: null,
    targetSteps: 1000,
    recordMaxSec: 120,
    demoVideoUrl: null,
    benefit: {
      [L.UK]:
        'Регулярна ходьба підтримує серце, тиск і рівновагу — найпростіша щоденна активність.',
      [L.PL]:
        'Regularny spacer wspiera serce, ciśnienie i równowagę — najprostsza codzienna aktywność.',
      [L.EN]:
        'Regular walking supports the heart, blood pressure and balance — the simplest daily activity.',
      [L.RU]:
        'Регулярная ходьба поддерживает сердце, давление и равновесие — самая простая ежедневная активность.',
    },
    description: {
      [L.UK]:
        'Покладіть телефон у кишеню або тримайте в руці й пройдіться у зручному темпі. Крокомір рахує кроки сам.',
      [L.PL]:
        'Włóż telefon do kieszeni lub trzymaj w dłoni i spaceruj w wygodnym tempie. Krokomierz liczy kroki sam.',
      [L.EN]:
        'Put the phone in your pocket or hold it and walk at a comfortable pace. The step counter counts by itself.',
      [L.RU]:
        'Положите телефон в карман или держите в руке и пройдитесь в удобном темпе. Шагомер считает шаги сам.',
    },
    safetyInstructions: {
      [L.UK]:
        'Зручне взуття, рівна поверхня. Відчули запаморочення чи біль — зупиніться й відпочиньте.',
      [L.PL]:
        'Wygodne obuwie, równa nawierzchnia. Przy zawrotach głowy lub bólu — zatrzymaj się i odpocznij.',
      [L.EN]: 'Comfortable shoes, even ground. If you feel dizzy or pain — stop and rest.',
      [L.RU]:
        'Удобная обувь, ровная поверхность. Почувствовали головокружение или боль — остановитесь и отдохните.',
    },
    sourceTitle: 'Paluch et al., The Lancet Public Health, 2022',
    sourceUrl: null,
    workoutTypes: [WorkoutType.WALKING, WorkoutType.CARDIO],
    durationMin: 10,
    bodyImpact: { muscles: 50, heart: 85, brain: 30, bones: 55, energy: 75 },
    muscles: [
      { [L.UK]: 'Ноги', [L.PL]: 'Nogi', [L.EN]: 'Legs', [L.RU]: 'Ноги' },
      { [L.UK]: 'Серце', [L.PL]: 'Serce', [L.EN]: 'Heart', [L.RU]: 'Сердце' },
      { [L.UK]: 'Легені', [L.PL]: 'Płuca', [L.EN]: 'Lungs', [L.RU]: 'Легкие' },
    ],
    variantGroup: null,
    voicePattern: VoicePattern.STEPS,
    isActive: true,
  },
];
