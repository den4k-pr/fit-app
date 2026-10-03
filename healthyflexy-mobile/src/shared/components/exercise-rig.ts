import { JOINTS, type ExerciseAnimationSpec, type Joint } from '@/constants/exercise-animations';

/**
 * «Скелет» анімації вправи. Раніше кожен суглоб їхав між позами ПО ПРЯМІЙ — під час руху кінцівки коротшали
 * й розтягувались (рука, що описує коло, «складалась» по хорді), а стопи/долоні, що мають стояти на місці, ковзали.
 *
 * Тепер між сусідніми позами:
 *  • кожна кістка ПОВЕРТАЄТЬСЯ навколо свого суглоба (інтерполюється кут, найкоротшою дугою), довжина — стала;
 *  • у самих ключових позах фігура точно збігається з авторською (`constants/exercise-animations.ts`);
 *  • стопа/долоня, що в обох позах на тому самому місці, «прибита»: коліно/лікоть рахуються оберненою
 *    кінематикою (дві кістки до заданої точки), тож нічого не ковзає й не відривається від опори.
 *
 * Усе тут — чисті функції з директивою 'worklet': рахуються на UI-потоці (Reanimated) і так само в Node
 * (перевірка кадрів поза застосунком).
 */

export const J = Object.fromEntries(JOINTS.map((j, i) => [j, i])) as Record<Joint, number>;
export const JOINT_COUNT = JOINTS.length;

/** Кістки в порядку прямої кінематики: [батько, дитина]. Корінь — таз. */
export const BONES: readonly (readonly [number, number])[] = [
  [J.pelvis, J.neck],
  [J.neck, J.head],
  [J.neck, J.shFar],
  [J.neck, J.shNear],
  [J.shFar, J.elFar],
  [J.elFar, J.haFar],
  [J.shNear, J.elNear],
  [J.elNear, J.haNear],
  [J.pelvis, J.hipFar],
  [J.pelvis, J.hipNear],
  [J.hipFar, J.knFar],
  [J.knFar, J.anFar],
  [J.anFar, J.toFar],
  [J.hipNear, J.knNear],
  [J.knNear, J.anNear],
  [J.anNear, J.toNear],
];
const boneOf = (child: number) => BONES.findIndex(([, c]) => c === child);

/**
 * Відносно якої кістки рахується кут (-1 — у світових координатах). Передпліччя — відносно плеча, гомілка —
 * відносно стегна, руки й голова — відносно корпусу: пряма рука лишається прямою, коли плече робить мах
 * (раніше кут кожної кістки інтерполювався окремо — і в «стрибку» кисті проходили через голову).
 * Стегна — у світових: ноги тримаються підлоги, а не корпусу.
 */
const REFS: readonly number[] = BONES.map(([p, c]) => {
  if (p === J.pelvis && c === J.neck) return -1;
  if (c === J.knFar || c === J.knNear) return -1;
  if (p === J.neck || p === J.pelvis) return 0;
  if (c === J.elFar || c === J.elNear) return 0;
  return boneOf(p);
});

/** Ланцюги з двох кісток для оберненої кінематики: [корінь, середній суглоб, кінець] */
const CHAINS: readonly (readonly [number, number, number])[] = [
  [J.shFar, J.elFar, J.haFar],
  [J.shNear, J.elNear, J.haNear],
  [J.hipFar, J.knFar, J.anFar],
  [J.hipNear, J.knNear, J.anNear],
];
/** Носок іде за щиколоткою: після IK ноги його перераховуємо */
const TOES: readonly (readonly [number, number])[] = [
  [J.anFar, J.toFar],
  [J.anNear, J.toNear],
];

/** Наскільки близько (px у полотні 200×200) мають бути точки двох поз, щоб вважати їх «тією самою опорою» */
const PIN_EPS = 1.5;

export interface RigSegment {
  /** Кут кожної кістки (відносно REFS) на початку відрізка й зміна кута (найкоротшою дугою), рад */
  ang0: number[];
  dAng: number[];
  len0: number[];
  len1: number[];
  root: [number, number, number, number];
  /** Для CHAINS: 1 — кінець ланцюга прибитий у точці pinXY */
  chainPin: number[];
  /** Для CHAINS: у який бік гнеться суглоб (з ключових поз): -1 / 1, 0 — «як ближче» */
  chainBend: number[];
  chainXY: number[];
  /** Для TOES: 1 — носок прибитий */
  toePin: number[];
  toeXY: number[];
  /** Точний знімок початкової пози (у ключових позах — рівно авторські координати) */
  start: number[];
}

export interface Rig {
  n: number;
  segs: RigSegment[];
  /** Тривалість кожного переходу, мс (униз повільніше, угору швидше) і початок кожного від старту кола */
  segMs: number[];
  segStart: number[];
  totalMs: number;
}

const flat = (pose: ExerciseAnimationSpec['frames'][number]): number[] => JOINTS.flatMap((j) => [pose[j][0], pose[j][1]]);

function wrapAngle(a: number): number {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x < -Math.PI) x += 2 * Math.PI;
  return x;
}

/** Попередній розрахунок (один раз на вправу, на JS-потоці) */
export function buildRig(spec: ExerciseAnimationSpec): Rig {
  const poses = spec.frames.map(flat);
  const n = poses.length;
  const segs: RigSegment[] = [];
  const weights: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = poses[i];
    const b = poses[(i + 1) % n];
    const ang0: number[] = [];
    const dAng: number[] = [];
    const len0: number[] = [];
    const len1: number[] = [];
    const worldA: number[] = [];
    const worldB: number[] = [];
    for (let bi = 0; bi < BONES.length; bi += 1) {
      const [p, c] = BONES[bi];
      const ax = a[c * 2] - a[p * 2];
      const ay = a[c * 2 + 1] - a[p * 2 + 1];
      const bx = b[c * 2] - b[p * 2];
      const by = b[c * 2 + 1] - b[p * 2 + 1];
      const la = Math.hypot(ax, ay);
      const lb = Math.hypot(bx, by);
      // кістка нульової довжини (у виді збоку плечі збігаються з шиєю) — кут беремо з іншої пози
      const aa = la > 1e-6 ? Math.atan2(ay, ax) : Math.atan2(by, bx);
      const ab = lb > 1e-6 ? Math.atan2(by, bx) : aa;
      worldA.push(aa);
      worldB.push(ab);
      const ref = REFS[bi];
      // кут відносно кістки-опори; інтерполюється найкоротшою дугою
      const ra = ref < 0 ? aa : wrapAngle(aa - worldA[ref]);
      const rb = ref < 0 ? ab : wrapAngle(ab - worldB[ref]);
      ang0.push(ra);
      dAng.push(wrapAngle(rb - ra));
      len0.push(la);
      len1.push(lb);
    }
    const chainPin: number[] = [];
    const chainXY: number[] = [];
    const chainBend: number[] = [];
    for (const [root, mid, end] of CHAINS) {
      // знак згину з тієї пози, де суглоб зігнутий сильніше: коліно не «перекидається», коли нога майже пряма
      const bendOf = (q: number[]) => {
        const mx = q[mid * 2] - q[root * 2];
        const my = q[mid * 2 + 1] - q[root * 2 + 1];
        const ex = q[end * 2] - q[root * 2];
        const ey = q[end * 2 + 1] - q[root * 2 + 1];
        const norm = Math.hypot(mx, my) * Math.hypot(ex, ey);
        return norm > 1e-6 ? (mx * ey - my * ex) / norm : 0;
      };
      const ba = bendOf(a);
      const bb = bendOf(b);
      const strongest = Math.abs(ba) >= Math.abs(bb) ? ba : bb;
      chainBend.push(Math.abs(strongest) < 0.02 ? 0 : Math.sign(strongest));
      const same = Math.abs(a[end * 2] - b[end * 2]) < PIN_EPS && Math.abs(a[end * 2 + 1] - b[end * 2 + 1]) < PIN_EPS;
      chainPin.push(same ? 1 : 0);
      chainXY.push(a[end * 2], a[end * 2 + 1]);
    }
    const toePin: number[] = [];
    const toeXY: number[] = [];
    for (const [, toe] of TOES) {
      const same = Math.abs(a[toe * 2] - b[toe * 2]) < PIN_EPS && Math.abs(a[toe * 2 + 1] - b[toe * 2 + 1]) < PIN_EPS;
      toePin.push(same ? 1 : 0);
      toeXY.push(a[toe * 2], a[toe * 2 + 1]);
    }
    // живий темп: опускання (шия йде вниз) — повільніше, підйом — швидше; загальна тривалість та сама
    const dyNeck = b[J.neck * 2 + 1] - a[J.neck * 2 + 1];
    weights.push(dyNeck > 3 ? 1.2 : dyNeck < -3 ? 0.82 : 1);
    segs.push({
      ang0,
      dAng,
      len0,
      len1,
      root: [a[J.pelvis * 2], a[J.pelvis * 2 + 1], b[J.pelvis * 2], b[J.pelvis * 2 + 1]],
      chainPin,
      chainBend,
      chainXY,
      toePin,
      toeXY,
      start: a,
    });
  }
  const totalMs = n * spec.segmentMs;
  const sum = weights.reduce((acc, w) => acc + w, 0) || 1;
  const segMs = weights.map((w) => (w / sum) * totalMs);
  const segStart: number[] = [];
  let acc = 0;
  for (const ms of segMs) {
    segStart.push(acc);
    acc += ms;
  }
  return { n, segs, segMs, segStart, totalMs };
}

/** Час від початку кола (мс) → фаза для solvePose (номер переходу + частка) */
export function phaseAt(rig: Rig, timeMs: number): number {
  'worklet';
  const t = ((timeMs % rig.totalMs) + rig.totalMs) % rig.totalMs;
  let i = rig.n - 1;
  for (let k = 0; k < rig.n; k += 1) {
    if (t < rig.segStart[k] + rig.segMs[k]) {
      i = k;
      break;
    }
  }
  return i + Math.min(0.9999, (t - rig.segStart[i]) / rig.segMs[i]);
}

/**
 * Плавний старт і зупинка в кожній позі з короткою паузою в крайніх точках (як людина, що контролює рух).
 * `lag` — запізнення (частка переходу): голова й кисті рушають трохи пізніше за тіло й «доганяють» —
 * перекриття руху, без якого анімація виглядає роботизованою. На кінцях переходу завжди 0 і 1.
 */
export function ease(f: number, lag: number): number {
  'worklet';
  const hold = 0.06;
  const x = Math.min(1, Math.max(0, (f - hold - lag) / (1 - 2 * hold - lag)));
  return (1 - Math.cos(Math.PI * x)) / 2;
}

/**
 * Дві кістки від `ax,ay` до цілі `tx,ty` довжинами l1, l2: повертає середній суглоб. Із двох можливих —
 * за знаком згину `bend` (-1 / 1), а без нього — ближчий до `hintX,hintY`.
 */
export function solveTwoBone(
  ax: number,
  ay: number,
  tx: number,
  ty: number,
  l1: number,
  l2: number,
  hintX: number,
  hintY: number,
  bend: number,
): [number, number] {
  'worklet';
  const dx = tx - ax;
  const dy = ty - ay;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6 || l1 + l2 < 1e-6) return [hintX, hintY];
  const ux = dx / d;
  const uy = dy / d;
  if (d >= l1 + l2) {
    // не дотягується — пряма кінцівка (у ключових позах такого не буває, лише мить посередині)
    const k = (l1 / (l1 + l2)) * d;
    return [ax + ux * k, ay + uy * k];
  }
  const dd = Math.max(d, Math.abs(l1 - l2) + 1e-3);
  const along = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const px = ax + ux * along;
  const py = ay + uy * along;
  const c1x = px - uy * h;
  const c1y = py + ux * h;
  const c2x = px + uy * h;
  const c2y = py - ux * h;
  // c1 дає від'ємний векторний добуток (середній − корінь) × (ціль − корінь), c2 — додатний
  if (bend < 0) return [c1x, c1y];
  if (bend > 0) return [c2x, c2y];
  const d1 = (c1x - hintX) ** 2 + (c1y - hintY) ** 2;
  const d2 = (c2x - hintX) ** 2 + (c2y - hintY) ** 2;
  return d1 <= d2 ? [c1x, c1y] : [c2x, c2y];
}

/**
 * Поза в момент `progress` (0…n по колу): масив [x0, y0, x1, y1, …] у порядку JOINTS.
 * Дані ланцюгів/кісток передаються параметрами, бо worklet не бачить змінних модуля.
 * Таз — 8-й суглоб JOINTS (координати out[16], out[17]).
 */
export function solvePose(rig: Rig, tables: RigTables, progress: number): number[] {
  'worklet';
  const bones = tables.bones;
  const refs = tables.refs;
  const chains = tables.chains;
  const chainBones = tables.chainBones;
  const toes = tables.toes;
  const toeBones = tables.toeBones;
  const floorAnkle = tables.floorAnkle;
  const floorToe = tables.floorToe;
  const n = rig.n;
  const pos = ((progress % n) + n) % n;
  const i = Math.floor(pos) % n;
  const f = pos - Math.floor(pos);
  const seg = rig.segs[i];
  const out = seg.start.slice();
  if (f < 1e-4) return out;
  const e = ease(f, 0);
  const eLag = ease(f, 0.1);

  // корінь — таз (індекс 8 у JOINTS; літерал, бо worklet не читає змінні модуля)
  out[16] = seg.root[0] + (seg.root[2] - seg.root[0]) * e;
  out[17] = seg.root[1] + (seg.root[3] - seg.root[1]) * e;
  const lens: number[] = [];
  const world: number[] = [];
  for (let b = 0; b < bones.length; b += 1) {
    const p = bones[b][0];
    const c = bones[b][1];
    const eb = tables.lag[b] ? eLag : e;
    const rel = seg.ang0[b] + seg.dAng[b] * eb;
    const a = refs[b] < 0 ? rel : world[refs[b]] + rel;
    world.push(a);
    const l = seg.len0[b] + (seg.len1[b] - seg.len0[b]) * eb;
    lens.push(l);
    out[c * 2] = out[p * 2] + Math.cos(a) * l;
    out[c * 2 + 1] = out[p * 2 + 1] + Math.sin(a) * l;
  }
  for (let k = 0; k < chains.length; k += 1) {
    if (!seg.chainPin[k]) continue;
    const root = chains[k][0];
    const mid = chains[k][1];
    const end = chains[k][2];
    const tx = seg.chainXY[k * 2];
    const ty = seg.chainXY[k * 2 + 1];
    const m = solveTwoBone(
      out[root * 2],
      out[root * 2 + 1],
      tx,
      ty,
      lens[chainBones[k][0]],
      lens[chainBones[k][1]],
      out[mid * 2],
      out[mid * 2 + 1],
      seg.chainBend[k],
    );
    out[mid * 2] = m[0];
    out[mid * 2 + 1] = m[1];
    out[end * 2] = tx;
    out[end * 2 + 1] = ty;
  }
  for (let k = 0; k < toes.length; k += 1) {
    const an = toes[k][0];
    const to = toes[k][1];
    if (seg.toePin[k]) {
      const tx = seg.toeXY[k * 2];
      const ty = seg.toeXY[k * 2 + 1];
      const leg = k + 2;
      if (!seg.chainPin[leg]) {
        // носок на місці, п'ята піднімається/опускається: щиколотка — на довжині стопи від носка, коліно — IK
        const fl = lens[toeBones[k]];
        const ddx = out[an * 2] - tx;
        const ddy = out[an * 2 + 1] - ty;
        const dl = Math.hypot(ddx, ddy) || 1;
        const ax = tx + (ddx / dl) * fl;
        const ay = ty + (ddy / dl) * fl;
        const hip = chains[leg][0];
        const knee = chains[leg][1];
        const m = solveTwoBone(
          out[hip * 2],
          out[hip * 2 + 1],
          ax,
          ay,
          lens[chainBones[leg][0]],
          lens[chainBones[leg][1]],
          out[knee * 2],
          out[knee * 2 + 1],
          seg.chainBend[leg],
        );
        out[knee * 2] = m[0];
        out[knee * 2 + 1] = m[1];
        out[an * 2] = ax;
        out[an * 2 + 1] = ay;
      }
      out[to * 2] = tx;
      out[to * 2 + 1] = ty;
    } else {
      // напрямок стопи — від поточної гомілки (після IK), кут стопи відносно неї
      const b = toeBones[k];
      const kn = chains[k + 2][1];
      const shin = Math.atan2(out[an * 2 + 1] - out[kn * 2 + 1], out[an * 2] - out[kn * 2]);
      const a = shin + seg.ang0[b] + seg.dAng[b] * e;
      out[to * 2] = out[an * 2] + Math.cos(a) * lens[b];
      out[to * 2 + 1] = out[an * 2 + 1] + Math.sin(a) * lens[b];
    }
  }
  // підлога: посеред руху щиколотка/носок не «провалюються» під неї (коліно підлаштовується)
  for (let k = 2; k < 4; k += 1) {
    const root = chains[k][0];
    const mid = chains[k][1];
    const end = chains[k][2];
    const toe = toes[k - 2][1];
    if (out[end * 2 + 1] > floorAnkle) {
      const dy = out[end * 2 + 1] - floorAnkle;
      const m = solveTwoBone(
        out[root * 2],
        out[root * 2 + 1],
        out[end * 2],
        floorAnkle,
        lens[chainBones[k][0]],
        lens[chainBones[k][1]],
        out[mid * 2],
        out[mid * 2 + 1],
        seg.chainBend[k],
      );
      out[mid * 2] = m[0];
      out[mid * 2 + 1] = m[1];
      out[end * 2 + 1] = floorAnkle;
      out[toe * 2 + 1] -= dy;
    }
    if (out[toe * 2 + 1] > floorToe) {
      // стопа повертається навколо щиколотки до підлоги (довжина стопи та сама)
      const ax = out[end * 2];
      const ay = out[end * 2 + 1];
      const fl = Math.hypot(out[toe * 2] - ax, out[toe * 2 + 1] - ay);
      const dy = floorToe - ay;
      if (fl > Math.abs(dy)) {
        const dir = out[toe * 2] >= ax ? 1 : -1;
        out[toe * 2] = ax + dir * Math.sqrt(fl * fl - dy * dy);
      }
      out[toe * 2 + 1] = floorToe;
    }
  }
  return out;
}

export interface RigTables {
  bones: readonly (readonly [number, number])[];
  refs: readonly number[];
  chains: readonly (readonly [number, number, number])[];
  chainBones: readonly (readonly [number, number])[];
  toes: readonly (readonly [number, number])[];
  toeBones: readonly number[];
  /** 1 — кістка з запізненням (голова, передпліччя) */
  lag: readonly number[];
  floorAnkle: number;
  floorToe: number;
}

/** Готові таблиці для solvePose (індекси кісток кожного ланцюга, опори кутів, рівень підлоги) */
export const RIG_TABLES: RigTables = {
  bones: BONES,
  refs: REFS,
  chains: CHAINS,
  chainBones: CHAINS.map(([r, m, e]) => [boneOf(m), boneOf(e)] as const),
  toes: TOES,
  toeBones: TOES.map(([, t]) => boneOf(t)),
  lag: BONES.map(([, c]) => (c === J.head || c === J.haFar || c === J.haNear ? 1 : 0)),
  /** Нижче цих рівнів щиколотка й носок не опускаються (підлога — y = 184) */
  floorAnkle: 183,
  floorToe: 185,
};

// ───── тулуб і контактна тінь (решта форм — exercise-figure.ts) ─────

/**
 * Контур тулуба: від шиї до таза, груди ширші за талію, округлі плечі й таз.
 * Вид спереду — ширина з плечей і кульшових суглобів (тож видно знизування плечима, поворот корпусу, нахили).
 */
export function torsoPath(pose: number[], front: boolean): string {
  'worklet';
  const nx = pose[2];
  const ny = pose[3];
  const px = pose[16];
  const py = pose[17];
  let ux = nx - px;
  let uy = ny - py;
  const ul = Math.hypot(ux, uy) || 1;
  ux /= ul;
  uy /= ul;
  // v — «вбік» від хребта
  const vx = -uy;
  const vy = ux;
  let topHalf = 14;
  let botHalf = 12;
  let shiftTop = 0;
  let shiftBot = 0;
  if (front) {
    const sfx = pose[4];
    const sfy = pose[5];
    const snx = pose[6];
    const sny = pose[7];
    const hfx = pose[18];
    const hfy = pose[19];
    const hnx = pose[20];
    const hny = pose[21];
    topHalf = Math.max(Math.hypot(snx - sfx, sny - sfy) / 2 + 5.5, 11);
    // футболка спереду: до стегон майже такої ж ширини, як у плечах (не «трикутник»)
    botHalf = Math.max(Math.hypot(hnx - hfx, hny - hfy) / 2 + 7.5, topHalf * 0.82);
    // центр плечей/таза може зміщуватись відносно шиї/таза (поворот, нахил)
    shiftTop = ((sfx + snx) / 2 - nx) * vx + ((sfy + sny) / 2 - ny) * vy;
    shiftBot = ((hfx + hnx) / 2 - px) * vx + ((hfy + hny) / 2 - py) * vy;
  }
  const tcx = nx + vx * shiftTop - ux * 3;
  const tcy = ny + vy * shiftTop - uy * 3;
  const bcx = px + vx * shiftBot + ux * 1;
  const bcy = py + vy * shiftBot + uy * 1;
  const len = Math.hypot(tcx - bcx, tcy - bcy);
  // точки на висоті грудей (30% від плечей) і живота (70%)
  const cx1 = tcx + (bcx - tcx) * 0.3;
  const cy1 = tcy + (bcy - tcy) * 0.3;
  const cx2 = tcx + (bcx - tcx) * 0.72;
  const cy2 = tcy + (bcy - tcy) * 0.72;
  // вид збоку: груди (спереду, +v) опукліші за спину; вид спереду — симетрично, талія вужча
  const chestF = front ? topHalf : topHalf + 3;
  const chestB = front ? topHalf : topHalf - 1;
  const waistF = front ? Math.min(topHalf, botHalf) * 0.95 : botHalf - 1.5;
  const waistB = front ? Math.min(topHalf, botHalf) * 0.95 : botHalf - 1;
  const r = (v: number) => Math.round(v * 10) / 10;
  const P = (x: number, y: number) => `${r(x)} ${r(y)}`;
  const shoulderLift = Math.min(10, len * 0.18);
  return (
    `M${P(tcx - vx * topHalf, tcy - vy * topHalf)}` +
    // плечі: дуга над шиєю
    `Q${P(tcx + ux * shoulderLift, tcy + uy * shoulderLift)} ${P(tcx + vx * topHalf, tcy + vy * topHalf)}` +
    // передній бік: груди → живіт → таз
    `C${P(cx1 + vx * chestF, cy1 + vy * chestF)} ${P(cx2 + vx * waistF, cy2 + vy * waistF)} ${P(bcx + vx * botHalf, bcy + vy * botHalf)}` +
    // округлий низ тазу
    `Q${P(bcx - ux * 9, bcy - uy * 9)} ${P(bcx - vx * botHalf, bcy - vy * botHalf)}` +
    // задній бік: таз → поперек → лопатки
    `C${P(cx2 - vx * waistB, cy2 - vy * waistB)} ${P(cx1 - vx * chestB, cy1 - vy * chestB)} ${P(tcx - vx * topHalf, tcy - vy * topHalf)}Z`
  );
}

export function contactShadow(pose: number[], floorY: number): [number, number, number] {
  'worklet';
  let minX = 1e9;
  let maxX = -1e9;
  let lowest = -1e9;
  let sumX = 0;
  let w = 0;
  for (let i = 0; i < pose.length; i += 2) {
    const x = pose[i];
    const y = pose[i + 1];
    if (y > lowest) lowest = y;
    // точки біля підлоги важать більше: тінь «під ногами», а не під головою
    const near = Math.max(0, 1 - (floorY - y) / 60);
    sumX += x * (0.2 + near);
    w += 0.2 + near;
    if (floorY - y < 40) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
  const cx = w > 0 ? sumX / w : 100;
  const spread = maxX > minX ? (maxX - minX) / 2 : 14;
  const lift = Math.max(0, floorY - 2 - lowest);
  const rx = Math.max(18, spread + 12) * Math.max(0.55, 1 - lift / 40);
  const opacity = Math.max(0.25, 1 - lift / 25);
  return [cx, rx, opacity];
}
