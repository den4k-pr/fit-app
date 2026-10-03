/**
 * Ключові пози векторної анімації вправ (власна «фігурка», без сторонніх GIF і ліцензій).
 * Координати в полотні 200×200, підлога — y = 184. Фігурка дивиться праворуч (вид збоку) або на глядача (вид спереду).
 * Між позами рух плавно інтерполюється (`ExerciseAnimation`). Нова вправа = новий запис у `EXERCISE_ANIMATIONS` за slug.
 *
 * Суглоби: «far» — дальня від глядача сторона (малюється блідіше, позаду), «near» — ближня.
 */
export type Point = readonly [number, number];

export const JOINTS = [
  'head',
  'neck',
  'shFar',
  'shNear',
  'elFar',
  'elNear',
  'haFar',
  'haNear',
  'pelvis',
  'hipFar',
  'hipNear',
  'knFar',
  'knNear',
  'anFar',
  'anNear',
  'toFar',
  'toNear',
] as const;
export type Joint = (typeof JOINTS)[number];
export type Pose = Record<Joint, Point>;

/** Статичні предмети сцени */
export type SceneProp = 'chair-behind' | 'chair-front' | 'wall-right' | 'table-right' | 'mat';

export interface ExerciseAnimationSpec {
  /** side — вид збоку; front — вид спереду (обидві руки/ноги однаково яскраві) */
  view: 'side' | 'front';
  props: SceneProp[];
  /** Пози по колу: остання плавно переходить у першу */
  frames: Pose[];
  /** Тривалість переходу між сусідніми позами, мс */
  segmentMs: number;
  /** Лежачи на спині: обличчям угору (інакше обличчя «дивиться» в бік руху / до підлоги) */
  supine?: boolean;
}

interface Limb {
  el: Point;
  ha: Point;
  kn: Point;
  an: Point;
  to: Point;
}

/** Поза збоку: плечі й кульшові суглоби збігаються з шиєю й тазом */
function side(head: Point, neck: Point, pelvis: Point, far: Limb, near: Limb): Pose {
  return {
    head,
    neck,
    shFar: neck,
    shNear: neck,
    elFar: far.el,
    elNear: near.el,
    haFar: far.ha,
    haNear: near.ha,
    pelvis,
    hipFar: pelvis,
    hipNear: pelvis,
    knFar: far.kn,
    knNear: near.kn,
    anFar: far.an,
    anNear: near.an,
    toFar: far.to,
    toNear: near.to,
  };
}

const add = ([x, y]: Point, dx: number, dy: number): Point => [x + dx, y + dy];

/** Зсунути всю позу (напр. підйом на носки — усе, крім носків) */
function shift(pose: Pose, dx: number, dy: number, except: Joint[] = []): Pose {
  const out = { ...pose };
  for (const j of JOINTS) if (!except.includes(j)) out[j] = add(pose[j], dx, dy);
  return out;
}

function withJoints(pose: Pose, patch: Partial<Pose>): Pose {
  return { ...pose, ...patch };
}

// ───── базові пози ─────

const STAND = side([100, 34], [100, 54], [100, 108],
  { el: [96, 80], ha: [94, 104], kn: [98, 146], an: [98, 182], to: [112, 184] },
  { el: [104, 80], ha: [106, 104], kn: [102, 146], an: [100, 182], to: [114, 184] },
);

const SEATED = side([88, 50], [84, 70], [80, 124],
  { el: [90, 94], ha: [102, 112], kn: [114, 128], an: [116, 182], to: [130, 184] },
  { el: [94, 94], ha: [106, 112], kn: [118, 126], an: [118, 182], to: [132, 184] },
);

const FRONT = {
  head: [100, 34],
  neck: [100, 54],
  shFar: [86, 58],
  shNear: [114, 58],
  elFar: [80, 84],
  elNear: [120, 84],
  haFar: [80, 108],
  haNear: [120, 108],
  pelvis: [100, 108],
  hipFar: [92, 110],
  hipNear: [108, 110],
  knFar: [92, 146],
  knNear: [108, 146],
  anFar: [92, 182],
  anNear: [108, 182],
  toFar: [84, 184],
  toNear: [116, 184],
} satisfies Pose;

// ───── вправи ─────

const squatUp = withJoints(STAND, { elFar: [114, 74], haFar: [132, 76], elNear: [118, 72], haNear: [136, 74] });
const squatDown = side([112, 58], [104, 76], [78, 122],
  { el: [120, 94], ha: [140, 94], kn: [108, 142], an: [98, 182], to: [112, 184] },
  { el: [124, 92], ha: [144, 92], kn: [112, 140], an: [100, 182], to: [114, 184] },
);

/** Руки схрещені на грудях — відносно шиї */
const crossed = (pose: Pose): Pose =>
  withJoints(pose, {
    elFar: add(pose.neck, 12, 24),
    haFar: add(pose.neck, 2, 12),
    elNear: add(pose.neck, 16, 22),
    haNear: add(pose.neck, 4, 10),
  });
const sitSeated = crossed(SEATED);
const sitLean = crossed(side([112, 60], [102, 76], [86, 122],
  { el: [0, 0], ha: [0, 0], kn: [116, 130], an: [116, 182], to: [130, 184] },
  { el: [0, 0], ha: [0, 0], kn: [118, 128], an: [118, 182], to: [132, 184] },
));
const sitStand = crossed(side([108, 36], [106, 56], [104, 108],
  { el: [0, 0], ha: [0, 0], kn: [112, 146], an: [116, 182], to: [130, 184] },
  { el: [0, 0], ha: [0, 0], kn: [114, 146], an: [118, 182], to: [132, 184] },
));

const seatedNearUp = withJoints(SEATED, { knNear: [116, 108], anNear: [124, 158], toNear: [138, 158] });
const seatedFarUp = withJoints(SEATED, { knFar: [112, 110], anFar: [120, 160], toFar: [134, 160] });

const marchNearUp = withJoints(STAND, {
  knNear: [124, 122], anNear: [118, 158], toNear: [132, 160],
  elNear: [94, 80], haNear: [88, 100], elFar: [108, 80], haFar: [118, 98],
});
const marchFarUp = withJoints(STAND, {
  knFar: [122, 122], anFar: [116, 158], toFar: [130, 160],
  elFar: [94, 80], haFar: [88, 100], elNear: [108, 80], haNear: [118, 98],
});

const walkA = withJoints(STAND, {
  knNear: [112, 146], anNear: [122, 180], toNear: [136, 184],
  knFar: [94, 146], anFar: [84, 178], toFar: [96, 184],
  elNear: [96, 80], haNear: [88, 100], elFar: [106, 80], haFar: [116, 100],
});
const walkPassA = withJoints(STAND, { knFar: [104, 142], anFar: [98, 172], toFar: [110, 176] });
const walkB = withJoints(STAND, {
  knFar: [110, 146], anFar: [120, 180], toFar: [134, 184],
  knNear: [96, 146], anNear: [86, 178], toNear: [98, 184],
  elFar: [96, 80], haFar: [88, 100], elNear: [106, 80], haNear: [116, 100],
});
const walkPassB = withJoints(STAND, { knNear: [106, 142], anNear: [100, 172], toNear: [112, 176] });

/** Підйом на носки: усе тіло вгору, носки лишаються на підлозі */
const raise = (pose: Pose, hands: Point): [Pose, Pose] => {
  const base = withJoints(pose, { haFar: hands, haNear: hands, elFar: add(hands, -18, 2), elNear: add(hands, -16, 4) });
  const up = shift(base, 0, -10, ['toFar', 'toNear', 'haFar', 'haNear']);
  return [base, withJoints(up, { elFar: add(hands, -18, -4), elNear: add(hands, -16, -2) })];
};
const [calfDown, calfUp] = raise(STAND, [138, 88]);
const [wallCalfDown, wallCalfUp] = raise(STAND, [150, 72]);

const inhale = withJoints(FRONT, {
  shFar: [86, 55], shNear: [114, 55], elFar: [74, 80], elNear: [126, 80], haFar: [94, 100], haNear: [106, 100],
});
const exhale = withJoints(FRONT, {
  elFar: [80, 86], elNear: [120, 86], haFar: [96, 104], haNear: [104, 104],
});

/** Плечі по колу: вгору → назад → вниз; руки звисають від плечей */
const shoulders = (dy: number, dx: number): Pose => {
  const shFar = add(FRONT.shFar, -dx, dy);
  const shNear = add(FRONT.shNear, dx, dy);
  return withJoints(FRONT, {
    shFar, shNear,
    elFar: add(shFar, -6, 26), elNear: add(shNear, 6, 26),
    haFar: add(shFar, -6, 50), haNear: add(shNear, 6, 50),
  });
};

const neckLeft = withJoints(FRONT, { head: [86, 38] });
const neckRight = withJoints(FRONT, { head: [114, 38] });

/** Кола стопою: ближня нога витягнута вперед, носок описує коло навколо щиколотки */
const ankle = (angleDeg: number): Pose => {
  const a = (angleDeg * Math.PI) / 180;
  return withJoints(SEATED, {
    knNear: [120, 118], anNear: [150, 134],
    toNear: [150 + Math.cos(a) * 14, 134 + Math.sin(a) * 14],
  });
};

const pushOut = side([134, 44], [128, 62], [112, 112],
  { el: [140, 70], ha: [154, 76], kn: [102, 148], an: [94, 182], to: [108, 184] },
  { el: [142, 68], ha: [156, 74], kn: [104, 148], an: [96, 182], to: [110, 184] },
);
const pushIn = side([140, 50], [132, 66], [116, 112],
  { el: [138, 90], ha: [154, 76], kn: [105, 148], an: [94, 182], to: [108, 184] },
  { el: [140, 88], ha: [156, 74], kn: [107, 148], an: [96, 182], to: [110, 184] },
);


// ───── основний каталог (дорослі, що нормально рухаються) ─────

/** Вид спереду з довільним положенням рук */
const frontArms = (pose: Pose, elFar: Point, haFar: Point, elNear: Point, haNear: Point): Pose =>
  withJoints(pose, { elFar, haFar, elNear, haNear });
const mid = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** Кола руками: руки в сторони, кисті описують коло радіусом 10 */
const armCircle = (deg: number): Pose => {
  const a = (deg * Math.PI) / 180;
  const haFar: Point = [42 + Math.cos(a) * 14, 58 + Math.sin(a) * 14];
  const haNear: Point = [158 - Math.cos(a) * 14, 58 + Math.sin(a) * 14];
  return frontArms(FRONT, mid(FRONT.shFar, haFar), haFar, mid(FRONT.shNear, haNear), haNear);
};

/** Повороти корпусу: плечі звужуються й зсуваються, руки зігнуті перед грудьми */
const twist = (dir: -1 | 0 | 1): Pose => {
  const dx = dir * 7;
  const narrow = dir === 0 ? 0 : 5;
  const shFar: Point = [86 + dx + narrow, 58];
  const shNear: Point = [114 + dx - narrow, 58];
  return withJoints(FRONT, {
    head: [100 + dir * 4, 34],
    neck: [100 + dx / 2, 54],
    shFar,
    shNear,
    elFar: [shFar[0] - 8 + dx, 78],
    haFar: [100 + dx * 1.6 - 6, 70],
    elNear: [shNear[0] + 8 + dx, 78],
    haNear: [100 + dx * 1.6 + 6, 70],
  });
};

/** Кола тазом: руки на поясі, таз зміщується по колу, голова майже на місці */
const hipCircle = (deg: number): Pose => {
  const a = (deg * Math.PI) / 180;
  const dx = Math.cos(a) * 9;
  const dy = Math.sin(a) * 3;
  return withJoints(FRONT, {
    elFar: [72, 88], haFar: [90 + dx * 0.6, 108 + dy],
    elNear: [128, 88], haNear: [110 + dx * 0.6, 108 + dy],
    pelvis: [100 + dx, 108 + dy],
    hipFar: [92 + dx, 110 + dy],
    hipNear: [108 + dx, 110 + dy],
    knFar: [92 + dx * 0.4, 146],
    knNear: [108 + dx * 0.4, 146],
  });
};

/** «Зірочка»: ноги разом / руки внизу ↔ ноги широко / руки над головою (у стрибку) */
const jackClosed = withJoints(FRONT, {
  hipFar: [95, 110], hipNear: [105, 110],
  knFar: [96, 146], knNear: [104, 146],
  anFar: [96, 182], anNear: [104, 182],
  toFar: [88, 184], toNear: [112, 184],
  elFar: [84, 84], haFar: [86, 108], elNear: [116, 84], haNear: [114, 108],
});
const jackOpen = shift(
  withJoints(FRONT, {
    knFar: [82, 146], knNear: [118, 146],
    anFar: [72, 180], anNear: [128, 180],
    toFar: [64, 182], toNear: [136, 182],
    elFar: [74, 36], haFar: [86, 14], elNear: [126, 36], haNear: [114, 14],
  }),
  0,
  -4,
);
/** Крок убік із руками вгору (без стрибка): крокує то ближня, то дальня нога */
const stepOutNear = withJoints(jackClosed, {
  knNear: [120, 146], anNear: [130, 182], toNear: [138, 184],
  elFar: [74, 36], haFar: [86, 14], elNear: [126, 36], haNear: [114, 14],
});
const stepOutFar = withJoints(jackClosed, {
  knFar: [80, 146], anFar: [70, 182], toFar: [62, 184],
  elFar: [74, 36], haFar: [86, 14], elNear: [126, 36], haNear: [114, 14],
});

/** Біг з високим підніманням колін: коліно до пояса, руки працюють */
const highNearUp = withJoints(STAND, {
  knNear: [128, 108], anNear: [122, 146], toNear: [136, 148],
  elNear: [92, 76], haNear: [96, 60], elFar: [112, 82], haFar: [124, 98],
});
const highFarUp = withJoints(STAND, {
  knFar: [126, 108], anFar: [120, 146], toFar: [134, 148],
  elFar: [92, 76], haFar: [96, 60], elNear: [112, 82], haNear: [124, 98],
});

/** Присідання без опори: руки вперед для рівноваги, стегна до паралелі */
const squatDeep = side([114, 62], [106, 80], [76, 126],
  { el: [124, 96], ha: [146, 96], kn: [110, 144], an: [98, 182], to: [112, 184] },
  { el: [128, 94], ha: [150, 94], kn: [114, 142], an: [100, 182], to: [114, 184] },
);

/** Присідання сумо (спереду): широка стійка, коліна в сторони, руки в замку біля грудей */
const sumoUp = withJoints(FRONT, {
  hipFar: [90, 110], hipNear: [110, 110],
  knFar: [80, 146], knNear: [120, 146],
  anFar: [72, 182], anNear: [128, 182],
  toFar: [62, 184], toNear: [138, 184],
  elFar: [84, 80], haFar: [98, 70], elNear: [116, 80], haNear: [102, 70],
});
const sumoDown = shift(
  withJoints(sumoUp, { knFar: [64, 124], knNear: [136, 124] }),
  0,
  28,
  ['anFar', 'anNear', 'toFar', 'toNear'],
);

/** Присідання з підйомом на носки: присід → стоїмо → на носках */
const [tipDown, tipUp] = raise(STAND, [132, 84]);
const squatTipDown = withJoints(squatDeep, {});

/**
 * Випад (вид збоку, обличчям праворуч) з анатомічними довжинами (стегно ~38, гомілка ~36, стопа ~14):
 * таз на рівні `px`, передня гомілка вертикальна, коліно задньої ноги майже торкається підлоги,
 * задня стопа — на носку, пальці вперед. `front` — котра нога попереду.
 */
function lunge(px: number, front: 'far' | 'near'): Pose {
  const frontLeg: Limb = { el: [0, 0], ha: [0, 0], kn: [px + 37, 146], an: [px + 37, 182], to: [px + 51, 184] };
  const rearLeg: Limb = { el: [0, 0], ha: [0, 0], kn: [px - 4, 178], an: [px - 40, 174], to: [px - 30, 184] };
  const pose = side([px + 2, 70], [px + 2, 90], [px, 144], front === 'far' ? frontLeg : rearLeg, front === 'far' ? rearLeg : frontLeg);
  // руки на поясі: лікті назад, кисті на тазі
  return withJoints(pose, {
    elFar: [px - 10, 112], haFar: [px + 4, 134],
    elNear: [px - 8, 114], haNear: [px + 6, 136],
  });
}
const LUNGE_STAND = withJoints(STAND, { elFar: [90, 84], haFar: [104, 104], elNear: [92, 86], haNear: [106, 106] });

/** Випад назад: передня нога лишається на місці (щиколотка як у стійці), тіло йде назад і вниз */
const lungeStandBack = shift(LUNGE_STAND, 10, 0);
const lungeBack = lunge(lungeStandBack.anFar[0] - 37, 'far');
const lungeBackOther = lunge(lungeStandBack.anNear[0] - 37, 'near');
/** Випад уперед: задня нога лишається на місці (носок як у стійці), крок уперед і вниз */
const lungeStandFwd = shift(LUNGE_STAND, -20, 0);
const lungeFwd = lunge(lungeStandFwd.toFar[0] + 30, 'near');
const lungeFwdOther = lunge(lungeStandFwd.toNear[0] + 30, 'far');

/** Боковий випад (спереду): присід на одну ногу, друга пряма */
const sideStand = withJoints(sumoUp, {});
const sideLunge = (dir: -1 | 1): Pose => {
  const dx = dir * 18;
  const pelvis: Point = [100 + dx, 128];
  const bent = dir === 1 ? 'Near' : 'Far';
  const pose: Pose = withJoints(sumoUp, {
    head: [100 + dx * 0.8, 56],
    neck: [100 + dx * 0.8, 76],
    shFar: [86 + dx * 0.8, 80],
    shNear: [114 + dx * 0.8, 80],
    elFar: [86 + dx * 0.8, 100], haFar: [98 + dx * 0.8, 92],
    elNear: [114 + dx * 0.8, 100], haNear: [102 + dx * 0.8, 92],
    pelvis,
    hipFar: [pelvis[0] - 8, 130],
    hipNear: [pelvis[0] + 8, 130],
  });
  if (bent === 'Near') return withJoints(pose, { knNear: [134, 150], anNear: [128, 182], knFar: [96, 156], anFar: [72, 182] });
  return withJoints(pose, { knFar: [66, 150], anFar: [72, 182], knNear: [104, 156], anNear: [128, 182] });
};

/** Віджимання від опори (стіл праворуч): тіло рівне, кисті на краю стола */
const inclineUp = side([146, 74], [132, 86], [88, 134],
  { el: [140, 102], ha: [150, 118], kn: [66, 158], an: [44, 180], to: [34, 184] },
  { el: [142, 100], ha: [152, 118], kn: [68, 158], an: [46, 180], to: [36, 184] },
);
const inclineDown = side([152, 94], [140, 104], [92, 143],
  { el: [126, 104], ha: [150, 118], kn: [68, 162], an: [44, 180], to: [34, 184] },
  { el: [128, 102], ha: [152, 118], kn: [70, 162], an: [46, 180], to: [36, 184] },
);

/** Віджимання з колін (на підлозі) */
const kneePushUp = side([152, 124], [138, 132], [96, 152],
  { el: [140, 158], ha: [142, 182], kn: [70, 180], an: [50, 166], to: [42, 160] },
  { el: [142, 158], ha: [144, 182], kn: [72, 180], an: [52, 166], to: [44, 160] },
);
const kneePushDown = side([150, 156], [136, 162], [94, 166],
  { el: [120, 156], ha: [142, 182], kn: [70, 180], an: [50, 166], to: [42, 160] },
  { el: [122, 154], ha: [144, 182], kn: [72, 180], an: [52, 166], to: [44, 160] },
);

/** Класичні віджимання: планка на носках */
const pushUpHigh = side([156, 122], [142, 130], [88, 150],
  { el: [142, 156], ha: [144, 182], kn: [62, 166], an: [38, 180], to: [30, 184] },
  { el: [144, 156], ha: [146, 182], kn: [64, 166], an: [40, 180], to: [32, 184] },
);
const pushUpLow = side([154, 158], [140, 164], [88, 170],
  { el: [122, 158], ha: [144, 182], kn: [62, 176], an: [38, 182], to: [30, 184] },
  { el: [124, 156], ha: [146, 182], kn: [64, 176], an: [40, 182], to: [32, 184] },
);

/** Планка на передпліччях: утримання, легке «дихання» тіла */
const plankA = side([148, 144], [134, 152], [86, 158],
  { el: [132, 182], ha: [152, 182], kn: [60, 170], an: [36, 178], to: [28, 184] },
  { el: [134, 182], ha: [154, 182], kn: [62, 170], an: [38, 178], to: [30, 184] },
);
const plankB = shift(plankA, 0, -2, ['elFar', 'elNear', 'haFar', 'haNear', 'toFar', 'toNear']);

/** «Птах-собака»: на карачках, протилежні рука й нога витягуються */
const allFours = side([148, 132], [132, 140], [84, 140],
  { el: [132, 162], ha: [132, 182], kn: [84, 182], an: [58, 182], to: [50, 184] },
  { el: [134, 162], ha: [134, 182], kn: [86, 182], an: [60, 182], to: [52, 184] },
);
const birdNear = withJoints(allFours, {
  elNear: [152, 134], haNear: [172, 128],
  knFar: [60, 140], anFar: [38, 138], toFar: [30, 140],
});
const birdFar = withJoints(allFours, {
  elFar: [152, 134], haFar: [172, 128],
  knNear: [62, 140], anNear: [40, 138], toNear: [32, 140],
});

/** «Мертвий жук»: лежачи на спині, руки вгору, ноги «столиком» (гомілки паралельно підлозі, стопи — далі від голови, ніж коліна); протилежні рука й нога опускаються */
const deadBug = side([150, 168], [134, 172], [82, 172],
  { el: [134, 150], ha: [134, 128], kn: [82, 140], an: [58, 140], to: [52, 133] },
  { el: [136, 150], ha: [136, 128], kn: [84, 140], an: [60, 140], to: [54, 133] },
);
const deadBugNear = withJoints(deadBug, {
  elNear: [152, 158], haNear: [170, 166],
  knFar: [62, 158], anFar: [40, 168], toFar: [32, 164],
});
const deadBugFar = withJoints(deadBug, {
  elFar: [152, 158], haFar: [170, 166],
  knNear: [64, 158], anNear: [42, 168], toNear: [34, 164],
});

/** Сідничний місток: лежачи на спині, стопи на підлозі, таз угору */
const bridgeDown = side([152, 174], [136, 176], [86, 178],
  { el: [114, 180], ha: [94, 182], kn: [60, 150], an: [48, 182], to: [38, 184] },
  { el: [116, 180], ha: [96, 182], kn: [62, 150], an: [50, 182], to: [40, 184] },
);
const bridgeUp = withJoints(bridgeDown, {
  pelvis: [86, 146], hipFar: [86, 146], hipNear: [86, 146],
  knFar: [58, 146], knNear: [60, 146],
  neck: [136, 172], shFar: [136, 172], shNear: [136, 172],
});

/** «Супермен»: лежачи на животі, руки вперед; руки, груди й ноги піднімаються */
const supermanDown = side([158, 172], [142, 175], [90, 177],
  { el: [162, 172], ha: [182, 172], kn: [64, 178], an: [38, 178], to: [30, 174] },
  { el: [164, 172], ha: [184, 172], kn: [66, 178], an: [40, 178], to: [32, 174] },
);
const supermanUp = side([160, 158], [144, 166], [90, 176],
  { el: [166, 156], ha: [184, 148], kn: [64, 170], an: [38, 162], to: [30, 158] },
  { el: [168, 156], ha: [186, 148], kn: [66, 170], an: [40, 162], to: [32, 158] },
);

/** «Гуд монінг»: руки за головою, нахил уперед із рівною спиною */
const goodMorningUp = withJoints(STAND, {
  elFar: [116, 44], haFar: [92, 34], elNear: [118, 42], haNear: [94, 32],
});
const goodMorningDown = side([150, 90], [134, 94], [80, 110],
  { el: [148, 76], ha: [128, 84], kn: [96, 146], an: [98, 182], to: [112, 184] },
  { el: [150, 74], ha: [130, 82], kn: [98, 146], an: [100, 182], to: [114, 184] },
);

/** Стійка на одній нозі: ближня нога піднята, руки трохи в сторони; легке похитування */
const oneLegA = withJoints(STAND, {
  knNear: [120, 128], anNear: [110, 160], toNear: [122, 162],
  elFar: [90, 78], haFar: [80, 96], elNear: [110, 78], haNear: [120, 96],
});
const oneLegB = shift(oneLegA, 2, 0, ['anFar', 'toFar']);

/** Нахили в сторони (спереду): рука над головою, корпус нахиляється */
const sideBend = (dir: -1 | 1): Pose => {
  const dx = dir * 12;
  const neck: Point = [100 + dx, 56];
  return withJoints(FRONT, {
    head: [100 + dx * 1.7, 38],
    neck,
    shFar: [86 + dx, 60 + (dir === -1 ? 4 : -2)],
    shNear: [114 + dx, 60 + (dir === 1 ? 4 : -2)],
    elFar: dir === 1 ? [84 + dx, 32] : [74, 88],
    haFar: dir === 1 ? [104 + dx * 1.6, 14] : [90, 106],
    elNear: dir === -1 ? [116 + dx, 32] : [126, 88],
    haNear: dir === -1 ? [96 + dx * 1.6, 14] : [110, 106],
  });
};

/** Нахил уперед: руки тягнуться до гомілок, коліна м'які */
// руки вгору трохи вперед: опускаючись, обидві йдуть через перед (не одна вперед, друга назад)
const foldUp = withJoints(STAND, { elFar: [106, 32], haFar: [113, 11], elNear: [109, 32], haNear: [116, 11] });
const foldDown = side([134, 150], [126, 134], [96, 106],
  { el: [124, 158], ha: [118, 176], kn: [102, 146], an: [100, 182], to: [114, 184] },
  { el: [126, 158], ha: [120, 176], kn: [104, 146], an: [102, 182], to: [116, 184] },
);

export const EXERCISE_ANIMATIONS: Record<string, ExerciseAnimationSpec> = {
  'chair-squat': { view: 'side', props: ['chair-behind'], frames: [squatUp, squatDown], segmentMs: 1400 },
  'chair-sit-to-stand': { view: 'side', props: ['chair-behind'], frames: [sitSeated, sitLean, sitStand, sitLean], segmentMs: 900 },
  'chair-seated-marches': { view: 'side', props: ['chair-behind'], frames: [SEATED, seatedNearUp, SEATED, seatedFarUp], segmentMs: 550 },
  'march-in-place': { view: 'side', props: [], frames: [marchNearUp, STAND, marchFarUp, STAND], segmentMs: 500 },
  'walk-steps': { view: 'side', props: [], frames: [walkA, walkPassA, walkB, walkPassB], segmentMs: 420 },
  'calf-raise': { view: 'side', props: ['chair-front'], frames: [calfDown, calfUp], segmentMs: 1100 },
  'wall-calf-raises': { view: 'side', props: ['wall-right'], frames: [wallCalfDown, wallCalfUp], segmentMs: 1100 },
  breathing: { view: 'front', props: [], frames: [exhale, inhale], segmentMs: 2600 },
  'shoulder-rolls': { view: 'front', props: [], frames: [shoulders(0, 0), shoulders(-7, 1), shoulders(-3, -3), shoulders(4, 0)], segmentMs: 550 },
  'neck-stretch': { view: 'front', props: [], frames: [FRONT, neckLeft, FRONT, neckRight], segmentMs: 1300 },
  'ankle-circles': { view: 'side', props: ['chair-behind'], frames: [ankle(-90), ankle(0), ankle(90), ankle(180)], segmentMs: 450 },
  'wall-push-ups': { view: 'side', props: ['wall-right'], frames: [pushOut, pushIn], segmentMs: 1200 },

  'arm-circles': { view: 'front', props: [], frames: [armCircle(0), armCircle(90), armCircle(180), armCircle(270)], segmentMs: 260 },
  'torso-twists': { view: 'front', props: [], frames: [twist(0), twist(-1), twist(0), twist(1)], segmentMs: 600 },
  'hip-circles': { view: 'front', props: [], frames: [hipCircle(0), hipCircle(90), hipCircle(180), hipCircle(270)], segmentMs: 450 },
  'jumping-jacks': { view: 'front', props: [], frames: [jackClosed, jackOpen], segmentMs: 380 },
  'step-jacks': { view: 'front', props: [], frames: [jackClosed, stepOutNear, jackClosed, stepOutFar], segmentMs: 480 },
  'high-knees': { view: 'side', props: [], frames: [highNearUp, STAND, highFarUp, STAND], segmentMs: 260 },
  squat: { view: 'side', props: [], frames: [squatUp, squatDeep], segmentMs: 1200 },
  'sumo-squat': { view: 'front', props: [], frames: [sumoUp, sumoDown], segmentMs: 1200 },
  'squat-calf-raise': { view: 'side', props: [], frames: [squatTipDown, tipDown, tipUp, tipDown], segmentMs: 800 },
  'reverse-lunge': { view: 'side', props: [], frames: [lungeStandBack, lungeBack, lungeStandBack, lungeBackOther], segmentMs: 1000 },
  'side-lunge': { view: 'front', props: [], frames: [sideStand, sideLunge(1), sideStand, sideLunge(-1)], segmentMs: 1000 },
  'forward-lunge': { view: 'side', props: [], frames: [lungeStandFwd, lungeFwd, lungeStandFwd, lungeFwdOther], segmentMs: 1000 },
  'incline-push-up': { view: 'side', props: ['table-right'], frames: [inclineUp, inclineDown], segmentMs: 1100 },
  'knee-push-up': { view: 'side', props: ['mat'], frames: [kneePushUp, kneePushDown], segmentMs: 1100 },
  'push-up': { view: 'side', props: ['mat'], frames: [pushUpHigh, pushUpLow], segmentMs: 1100 },
  plank: { view: 'side', props: ['mat'], frames: [plankA, plankB], segmentMs: 1600 },
  'bird-dog': { view: 'side', props: ['mat'], frames: [allFours, birdNear, allFours, birdFar], segmentMs: 900 },
  'dead-bug': { view: 'side', props: ['mat'], frames: [deadBug, deadBugNear, deadBug, deadBugFar], segmentMs: 900, supine: true },
  'glute-bridge': { view: 'side', props: ['mat'], frames: [bridgeDown, bridgeUp], segmentMs: 1100, supine: true },
  superman: { view: 'side', props: ['mat'], frames: [supermanDown, supermanUp], segmentMs: 1200 },
  'good-morning': { view: 'side', props: [], frames: [goodMorningUp, goodMorningDown], segmentMs: 1300 },
  'single-leg-stand': { view: 'side', props: [], frames: [oneLegA, oneLegB], segmentMs: 1400 },
  'side-bends': { view: 'front', props: [], frames: [FRONT, sideBend(-1), FRONT, sideBend(1)], segmentMs: 1000 },
  'forward-fold': { view: 'side', props: [], frames: [foldUp, STAND, foldDown, STAND], segmentMs: 1100 },

  // вправи ротації «Підбір ШІ»: рух близький до наявних поз, темп — свій
  'belly-breathing': { view: 'front', props: [], frames: [exhale, inhale], segmentMs: 3000 },
  'box-breathing': { view: 'front', props: [], frames: [exhale, inhale, inhale, exhale], segmentMs: 2000 },
  'long-exhale-breathing': { view: 'front', props: [], frames: [inhale, exhale], segmentMs: 3400 },
  'pursed-lip-breathing': { view: 'front', props: [], frames: [exhale, inhale], segmentMs: 2400 },
  'arm-raise-breathing': { view: 'front', props: [], frames: [armCircle(0), armCircle(90), armCircle(180), armCircle(270)], segmentMs: 1400 },
  'tandem-stand': { view: 'side', props: [], frames: [oneLegA, oneLegB], segmentMs: 1800 },
  'cross-crawl': { view: 'side', props: [], frames: [marchNearUp, STAND, marchFarUp, STAND], segmentMs: 700 },
  'toe-taps': { view: 'front', props: [], frames: [jackClosed, stepOutNear, jackClosed, stepOutFar], segmentMs: 700 },
  'side-leg-raise': { view: 'front', props: [], frames: [jackClosed, stepOutNear], segmentMs: 1000 },
};
