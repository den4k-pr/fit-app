import { J, contactShadow, torsoPath } from './exercise-rig';
import {
  faceDetails,
  handPath,
  headShapes,
  highlightOf,
  hipsPath,
  jointAt,
  seamAcross,
  segmentPath,
  shadeOf,
  shoePath,
  soleOf,
  stripeOf,
} from './exercise-figure';
import type { ExerciseAnimationSpec, SceneProp } from '@/constants/exercise-animations';

/**
 * Опис «об'ємної» сцени вправи — ОДИН для застосунку (`ExerciseAnimation`) і для перевірки кадрів у Node
 * (`sceneSvg`). Фігура — людина з пропорціями дорослого: кінцівки — конусні форми з рельєфом м'язів, футболка,
 * джогери, кросівки, голова з волоссям і обличчям (exercise-figure.ts); світло зверху зліва (градієнти),
 * дальні кінцівки темніші; під фігурою — контактна тінь; меблі — у легкій перспективі.
 */

export type Depth = 'far' | 'near';
export type Material = 'skin' | 'shirt' | 'pants' | 'shoe';

/**
 * Частина фігури. `limb` — конус між суглобами a → b (від t0 до t1 уздовж кістки, радіуси ra → rb, м'яз `bulge`);
 * `drop` — плечовий суглоб нижче шиї. Решта — окремі форми (долоня, кросівок, таз, тулуб, голова).
 */
export type FigurePart =
  | { kind: 'limb'; a: number; b: number; t0: number; t1: number; ra: number; rb: number; bulge: number; drop: number; mat: Material; depth: Depth }
  | { kind: 'hand'; el: number; ha: number; depth: Depth }
  | { kind: 'shoe'; an: number; to: number; depth: Depth }
  | { kind: 'hips' }
  | { kind: 'torso' }
  | { kind: 'head' };

/** Дальні кінцівки трохи тонші й темніші (глибина) */
export const FAR_SCALE = 0.94;
export const FAR_OPACITY = 0.8;

const limb = (
  a: number,
  b: number,
  ra: number,
  rb: number,
  bulge: number,
  mat: Material,
  depth: Depth,
  extra: Partial<{ t0: number; t1: number; drop: number }> = {},
): FigurePart => {
  const k = depth === 'far' ? FAR_SCALE : 1;
  return { kind: 'limb', a, b, t0: extra.t0 ?? 0, t1: extra.t1 ?? 1, ra: ra * k, rb: rb * k, bulge: bulge * k, drop: extra.drop ?? 0, mat, depth };
};

/** Нога: стегно (штани, звужується до коліна) → гомілка з литкою → кросівок */
const leg = (hip: number, kn: number, an: number, to: number, depth: Depth): FigurePart[] => [
  limb(kn, an, 5.6, 3.7, 1.3, 'pants', depth),
  limb(hip, kn, 8.2, 5.8, 1.1, 'pants', depth),
  { kind: 'shoe', an, to, depth },
];
/** Плече: шкіра + короткий рукав футболки */
const upperArm = (sh: number, el: number, depth: Depth): FigurePart[] => [
  limb(sh, el, 4.9, 3.9, 0.6, 'skin', depth, { drop: 5 }),
  limb(sh, el, 5.6, 5, 0.2, 'shirt', depth, { drop: 5, t1: 0.42 }),
];
/** Передпліччя + долоня */
const forearm = (el: number, ha: number, depth: Depth): FigurePart[] => [
  limb(el, ha, 3.9, 2.9, 0.5, 'skin', depth),
  { kind: 'hand', el, ha, depth },
];
const arm = (sh: number, el: number, ha: number, depth: Depth): FigurePart[] => [...forearm(el, ha, depth), ...upperArm(sh, el, depth)];
const neck: FigurePart = limb(J.neck, J.head, 4.6, 4.4, 0, 'skin', 'near', { t1: 0.62 });

export type GroupKind = 'limbs' | 'body' | 'head';

export interface FigureGroup {
  kind: GroupKind;
  depth: Depth;
  parts: FigurePart[];
  /** Матеріали заливок у порядку малювання (що є в групі) */
  mats: Material[];
}

const FILL_ORDER: Material[] = ['pants', 'skin', 'shirt', 'shoe'];
const group = (kind: GroupKind, depth: Depth, parts: FigurePart[]): FigureGroup => ({
  kind,
  depth,
  parts,
  mats: FILL_ORDER.filter((m) => parts.some((p) => partMaterial(p) === m)),
});

/**
 * Групи малювання. У кожній: спільний КОНТУР (силует без «швів» на суглобах) → заливки матеріалами →
 * тінь і відблиск уздовж кожної кінцівки (циліндр) → шви, лампаси, підошва.
 * Вид збоку: дальні кінцівки позаду тулуба. Вид спереду: плечі — з-під футболки, передпліччя — поверх
 * (схрещені руки, руки на поясі видно).
 */
export function figureGroups(view: ExerciseAnimationSpec['view']): FigureGroup[] {
  const body = group('body', 'near', [{ kind: 'hips' }, neck, { kind: 'torso' }]);
  const head = group('head', 'near', [{ kind: 'head' }]);
  if (view === 'front') {
    return [
      group('limbs', 'near', [...leg(J.hipFar, J.knFar, J.anFar, J.toFar, 'near'), ...leg(J.hipNear, J.knNear, J.anNear, J.toNear, 'near')]),
      group('limbs', 'near', [...upperArm(J.shFar, J.elFar, 'near'), ...upperArm(J.shNear, J.elNear, 'near')]),
      body,
      head,
      group('limbs', 'near', [...forearm(J.elFar, J.haFar, 'near'), ...forearm(J.elNear, J.haNear, 'near')]),
    ];
  }
  return [
    group('limbs', 'far', arm(J.shFar, J.elFar, J.haFar, 'far')),
    group('limbs', 'far', leg(J.hipFar, J.knFar, J.anFar, J.toFar, 'far')),
    body,
    head,
    group('limbs', 'near', leg(J.hipNear, J.knNear, J.anNear, J.toNear, 'near')),
    group('limbs', 'near', arm(J.shNear, J.elNear, J.haNear, 'near')),
  ];
}

/** Товщина контуру силуету (у полотні 200×200) */
export const OUTLINE_W = 1.5;

// ───── кольори ─────

export interface ScenePalette {
  /** Градієнти матеріалів: світло (зверху зліва) → колір → тінь */
  mat: Record<Material | 'hair', [string, string, string]>;
  /** Ті самі матеріали для дальніх кінцівок — темніші (глибина без прозорості) */
  matFar: Record<Material | 'hair', [string, string, string]>;
  /** Тінь і відблиск на формах, шви (темні), лампаси (світлі), підошва, брови/рот, відблиск волосся */
  shade: string;
  hi: string;
  seam: string;
  stripe: string;
  sole: string;
  brow: string;
  mouth: string;
  hairShine: string;
  /** Підлога сцени: темніша смуга внизу (глибина) */
  floor: string;
  /** Тонкий контур фігури (відділяє від тла й дальні кінцівки від ближніх) */
  outline: string;
  eye: string;
  shadow: string;
  stage: string;
  glow: string;
  prop: { top: string; front: string; side: string; edge: string; floorShadow: string };
}

const hex = (c: string): [number, number, number] | null => {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
/** Змішати два hex-кольори (t = 0 → a, 1 → b); не hex — повертаємо запасний */
export function mix(a: string, b: string, t: number, fallback: string): string {
  const x = hex(a);
  const y = hex(b);
  if (!x || !y) return fallback;
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Палітра: футболка — у кольорі бренду (з теми, її можна змінити в CRM), штани — графітові джогери,
 * білі кросівки, тепла шкіра. dark — сцена вправи (темно-зелена), light — світла картка.
 */
export function scenePalette(tone: 'dark' | 'light', theme: { mint: string; forest: string; green: string }): ScenePalette {
  const shirtBase = tone === 'dark' ? theme.mint : theme.green;
  const common = {
    skin: ['#F6D2B6', '#EBB896', '#D59B77'] as [string, string, string],
    pants: ['#557083', '#40596B', '#2E4556'] as [string, string, string],
    shoe: ['#FFFFFF', '#F1F5F3', '#D3DCD8'] as [string, string, string],
    hair: ['#5A4234', '#3B2A20', '#231812'] as [string, string, string],
  };
  const shirt: [string, string, string] = [
    mix(shirtBase, '#FFFFFF', 0.4, '#DDF8E8'),
    shirtBase,
    mix(shirtBase, theme.forest, 0.25, '#9FD6B6'),
  ];
  const all = { ...common, shirt };
  const darker = (c: [string, string, string]): [string, string, string] => c.map((x) => mix(x, '#0B2A1B', 0.3, x)) as [string, string, string];
  const matFar = Object.fromEntries(Object.entries(all).map(([k, v]) => [k, darker(v)])) as Record<Material | 'hair', [string, string, string]>;
  const details = {
    matFar,
    shade: 'rgba(12, 32, 22, 0.24)',
    hi: 'rgba(255, 255, 255, 0.34)',
    seam: 'rgba(20, 60, 40, 0.35)',
    stripe: 'rgba(255, 255, 255, 0.75)',
    sole: '#A9B6B1',
    brow: '#3B2A20',
    mouth: '#B06F55',
    hairShine: 'rgba(255, 255, 255, 0.28)',
    floor: tone === 'dark' ? 'rgba(0, 0, 0, 0.16)' : 'rgba(23, 89, 58, 0.05)',
  };
  if (tone === 'dark') {
    return {
      mat: all,
      ...details,
      outline: 'rgba(8, 40, 25, 0.55)',
      eye: '#2A1E17',
      shadow: 'rgba(0, 0, 0, 0.55)',
      stage: 'rgba(255, 255, 255, 0.10)',
      glow: 'rgba(255, 255, 255, 0.07)',
      prop: { top: 'rgba(255,255,255,0.30)', front: 'rgba(255,255,255,0.16)', side: 'rgba(255,255,255,0.09)', edge: 'rgba(255,255,255,0.42)', floorShadow: 'rgba(0,0,0,0.22)' },
    };
  }
  return {
    mat: all,
    ...details,
    outline: 'rgba(23, 60, 40, 0.35)',
    eye: '#2A1E17',
    shadow: 'rgba(23, 89, 58, 0.28)',
    stage: 'rgba(23, 89, 58, 0.07)',
    glow: 'rgba(51, 178, 110, 0.06)',
    prop: { top: '#E4F1E8', front: '#CFE4D6', side: '#DCEBE1', edge: '#A9D2B8', floorShadow: 'rgba(23,89,58,0.12)' },
  };
}

// ───── предмети (статичні, у легкій перспективі: глибина — вгору-вправо) ─────

export interface PropShape {
  d: string;
  /** Заливка (ключ палітри) або обведення */
  fill?: keyof ScenePalette['prop'];
  stroke?: keyof ScenePalette['prop'];
  width?: number;
}

const DX = 7;
const DY = -5;

function chair(x0: number): PropShape[] {
  const seatY = 128;
  const x1 = x0 + 36;
  return [
    // тінь стільця на підлозі
    { d: `M${x0 - 4} 185Q${x0 + 20} 180 ${x1 + 10} 184Q${x0 + 20} 189 ${x0 - 4} 185Z`, fill: 'floorShadow' },
    // дальні ніжки (за сидінням) — темніші
    { d: `M${x0 + DX} ${86 + DY}V${184 + DY}M${x1 + DX - 2} ${seatY + DY}V${184 + DY}`, stroke: 'side', width: 3.5 },
    // спинка: панель у глибину з заокругленим верхом
    { d: `M${x0} ${90}Q${x0} ${84} ${x0 + 3} ${83}L${x0 + DX + 3} ${83 + DY}Q${x0 + DX} ${84 + DY} ${x0 + DX} ${90 + DY}L${x0 + DX} ${120 + DY}L${x0} ${120}Z`, fill: 'side' },
    { d: `M${x0} ${88}Q${x0 + 1} ${84} ${x0 + 4} ${83.5}`, stroke: 'edge', width: 2.5 },
    // сидіння-подушка: верх, передня грань (товща, із заокругленням)
    { d: `M${x0 + 1} ${seatY}L${x1 - 1} ${seatY}Q${x1 + 1} ${seatY} ${x1 + 2} ${seatY - 1.5}L${x1 + DX} ${seatY + DY + 0.5}L${x0 + DX + 1} ${seatY + DY}Z`, fill: 'top' },
    { d: `M${x0} ${seatY}H${x1}Q${x1 + 1.5} ${seatY} ${x1 + 1.5} ${seatY + 2}V${seatY + 4}Q${x1 + 1.5} ${seatY + 6} ${x1 - 1} ${seatY + 6}H${x0 + 1}Q${x0 - 1} ${seatY + 6} ${x0 - 1} ${seatY + 4}V${seatY + 2}Q${x0 - 1} ${seatY} ${x0} ${seatY}Z`, fill: 'front' },
    { d: `M${x0 + 1} ${seatY + 0.3}H${x1 - 1}`, stroke: 'edge', width: 1 },
    // ближні ніжки й стійка спинки
    { d: `M${x0} ${86}V${184}M${x1 - 2} ${seatY + 6}V${184}`, stroke: 'edge', width: 4 },
  ];
}

export const PROP_SHAPES: Record<SceneProp, PropShape[]> = {
  'chair-behind': chair(58),
  'chair-front': chair(140),
  'wall-right': [
    { d: 'M150 185Q160 181 176 184Q160 188 150 185Z', fill: 'floorShadow' },
    { d: `M172 16L${172 + DX} ${16 + DY}L${172 + DX} ${184 + DY}L172 184Z`, fill: 'side' },
    { d: `M158 16L${158 + DX} ${16 + DY}L${172 + DX} ${16 + DY}L172 16Z`, fill: 'top' },
    { d: 'M158 16H172V184H158Z', fill: 'front' },
    // плінтус
    { d: 'M157 176H172V184H157Z', fill: 'top' },
    { d: 'M158 16V184', stroke: 'edge', width: 1.6 },
  ],
  'table-right': [
    { d: 'M144 185Q170 180 200 184Q170 189 144 185Z', fill: 'floorShadow' },
    { d: `M${156 + DX} ${126 + DY}V${184 + DY}M${190 + DX} ${126 + DY}V${184 + DY}`, stroke: 'side', width: 3.5 },
    { d: `M147 120L197 120L${197 + DX} ${120 + DY}L${147 + DX} ${120 + DY}Z`, fill: 'top' },
    { d: 'M147 120H197V126.5H147Z', fill: 'front' },
    { d: 'M147 120.3H197', stroke: 'edge', width: 1 },
    { d: 'M156 126.5V184M190 126.5V184', stroke: 'edge', width: 4 },
  ],
  mat: [
    // килимок: заокруглений, з товщиною й рельєфними смугами
    { d: `M14 183Q12 183 13 181.5L${18 + DX} ${179 + DY}Q${19 + DX} ${178 + DY} ${21 + DX} ${178 + DY}L${184 + DX} ${178 + DY}Q${187 + DX} ${178 + DY} ${186 + DX} ${179.5 + DY}L187 181.5Q186 183 184 183Z`, fill: 'top' },
    { d: 'M14 183H184Q187 183 187 185V185.5Q187 187 184 187H14Q11 187 11 185.5V185Q11 183 14 183Z', fill: 'front' },
    { d: `M30 182L${30 + DX} ${179 + DY}M70 182L${70 + DX} ${179 + DY}M110 182L${110 + DX} ${179 + DY}M150 182L${150 + DX} ${179 + DY}`, stroke: 'side', width: 0.8 },
  ],
};

/** Підлога сцени (y), центр світлої «сцени» під фігурою */
export const FLOOR_Y = 186;

// ───── геометрія групи на кадр (worklet: UI-потік) ─────

export interface GroupGeometry {
  outline: string;
  fills: Record<Material, string>;
  shade: string;
  hi: string;
  seam: string;
  stripe: string;
  sole: string;
}

/** Шлях частини фігури для пози */
export function partPath(part: FigurePart, pose: number[], front: boolean): string {
  'worklet';
  switch (part.kind) {
    case 'limb':
      return segmentPath(pose, part.a, part.b, part.t0, part.t1, part.ra, part.rb, part.bulge, part.drop);
    case 'hand':
      return handPath(pose, part.el, part.ha, part.depth === 'far' ? 0.94 : 1);
    case 'shoe':
      return shoePath(pose, part.an, part.to, part.depth === 'far' ? 0.94 : 1);
    case 'hips':
      return hipsPath(pose, front);
    case 'torso':
      return pose.length ? torsoPath(pose, front) : '';
    default:
      return '';
  }
}

/**
 * Уся геометрія групи на один кадр — ОДИН раз (а не окремо для кожного шару): заливки об'єднані за
 * матеріалом, тінь/відблиск — за віссю кожної кінцівки, деталі — лінії.
 */
export function groupGeometry(g: FigureGroup, pose: number[], front: boolean): GroupGeometry {
  'worklet';
  const empty = { outline: '', fills: { pants: '', skin: '', shirt: '', shoe: '' }, shade: '', hi: '', seam: '', stripe: '', sole: '' };
  if (pose.length === 0) return empty;
  let outline = '';
  let shade = '';
  let hi = '';
  let seam = '';
  let stripe = '';
  let sole = '';
  const fills = { pants: '', skin: '', shirt: '', shoe: '' };
  for (let i = 0; i < g.parts.length; i += 1) {
    const part = g.parts[i];
    const d = partPath(part, pose, front);
    outline += d;
    if (part.kind === 'limb') {
      fills[part.mat] += d;
      const a = jointAt(pose, part.a, part.b, part.t0, part.drop);
      const b = jointAt(pose, part.a, part.b, part.t1, part.drop);
      shade += shadeOf(a[0], a[1], b[0], b[1], part.ra, part.rb, 0.42, 0.56);
      // відблиск — лише на шкірі (на тканині він виглядав як «латекс» / смуга)
      if (part.mat === 'skin') hi += highlightOf(a[0], a[1], b[0], b[1], part.ra, part.rb);
      if (part.mat === 'pants') stripe += stripeOf(a[0], a[1], b[0], b[1], part.ra, part.rb, 0.55);
      // край рукава
      if (part.mat === 'shirt' && part.t1 < 1) seam += seamAcross(a[0], a[1], b[0], b[1], 1, part.rb);
    } else if (part.kind === 'hand') {
      fills.skin += d;
    } else if (part.kind === 'shoe') {
      fills.shoe += d;
      sole += soleOf(pose, part.an, part.to, part.depth === 'far' ? 0.94 : 1);
    } else if (part.kind === 'hips') {
      fills.pants += d;
      shade += shadeOf(pose[16], pose[17] - 2, pose[16], pose[17] + 2, 8, 8, 0.5, 0.45);
    } else if (part.kind === 'torso') {
      fills.shirt += d;
      // тінь уздовж хребта; низ футболки
      const nx = pose[2];
      const ny = pose[3];
      const px = pose[16];
      const py = pose[17];
      const w = front ? 16 : 12.5;
      shade += shadeOf(nx, ny + 4, px, py - 4, w, w * 0.8, 0.62, 0.36);
      seam += seamAcross(nx, ny, px, py, 0.93, front ? 12 : 10);
    }
  }
  return { outline, fills, shade, hi, seam, stripe, sole };
}

export const partMaterial = (part: FigurePart): Material =>
  part.kind === 'limb' ? part.mat : part.kind === 'hand' ? 'skin' : part.kind === 'shoe' ? 'shoe' : part.kind === 'hips' ? 'pants' : 'shirt';

// ───── SVG-рядок: перевірка кадрів поза застосунком (Node) ─────

const f1 = (v: number) => Math.round(v * 10) / 10;
const GRADIENTS = ['skin', 'shirt', 'pants', 'shoe', 'hair'] as const;

/** Та сама сцена, що в `ExerciseAnimation`, як SVG-рядок (без анімації) — для контактних аркушів у Node */
export function sceneSvg(spec: ExerciseAnimationSpec, pose: number[], tone: 'dark' | 'light'): string {
  const p = scenePalette(tone, { mint: '#BDF2D2', forest: '#17593A', green: '#33B26E' });
  const front = spec.view === 'front';
  const [sx, srx, so] = contactShadow(pose, FLOOR_Y);
  const grad = (id: string, c: [string, string, string]) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="0.5" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient>`;
  const defs = `<defs>${GRADIENTS.map((m) => grad(`m-${m}`, p.mat[m]) + grad(`f-${m}`, p.matFar[m])).join('')}
    <radialGradient id="stage" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${p.stage}"/><stop offset="1" stop-color="${p.stage}" stop-opacity="0"/></radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${p.glow}"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient>
    <radialGradient id="shadow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${p.shadow}"/><stop offset="1" stop-color="${p.shadow}" stop-opacity="0"/></radialGradient>
    <radialGradient id="floor" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${p.floor}"/><stop offset="1" stop-color="${p.floor}" stop-opacity="0"/></radialGradient>
  </defs>`;
  const props = spec.props
    .flatMap((k) => PROP_SHAPES[k])
    .map((s) => (s.fill ? `<path d="${s.d}" fill="${p.prop[s.fill]}"/>` : `<path d="${s.d}" stroke="${p.prop[s.stroke ?? 'edge']}" stroke-width="${s.width ?? 3}" stroke-linecap="round" fill="none"/>`))
    .join('');
  const line = (d: string, color: string, w: number) => (d ? `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>` : '');
  const groups = figureGroups(spec.view)
    .map((g) => {
      if (g.kind === 'head') {
        const h = headShapes(pose, front, !!spec.supine);
        const fd = faceDetails(pose, front, !!spec.supine);
        const edge = `stroke="${p.outline}" stroke-width="${OUTLINE_W * 2}" stroke-linejoin="round"`;
        return (
          `<path d="${h.skin}" fill="${p.outline}" ${edge}/><path d="${h.hair}" fill="${p.outline}" ${edge}/><path d="${h.nose}" fill="${p.outline}" ${edge}/>` +
          `<path d="${h.skin}" fill="url(#m-skin)"/><path d="${h.nose}" fill="url(#m-skin)"/>` +
          `<path d="${h.ear}" fill="${p.mat.skin[1]}" stroke="${p.mat.skin[2]}" stroke-width="0.6"/><path d="${h.eye}" fill="${p.eye}"/>` +
          line(fd.brow, p.brow, 1.1) + line(fd.mouth, p.mouth, 1) +
          `<path d="${h.hair}" fill="url(#m-hair)"/>` + line(fd.shine, p.hairShine, 1.4)
        );
      }
      const geo = groupGeometry(g, pose, front);
      const pre = g.depth === 'far' ? 'f' : 'm';
      return (
        `<path d="${geo.outline}" fill="${p.outline}" stroke="${p.outline}" stroke-width="${OUTLINE_W * 2}" stroke-linejoin="round"/>` +
        g.mats.map((m) => `<path d="${geo.fills[m]}" fill="url(#${pre}-${m})"/>`).join('') +
        `<path d="${geo.shade}" fill="${p.shade}"/><path d="${geo.hi}" fill="${p.hi}"/>` +
        line(geo.stripe, p.stripe, 0.9) + line(geo.seam, p.seam, 0.9) + line(geo.sole, p.sole, 1.6)
      );
    })
    .join('');
  return `${defs}<circle cx="100" cy="96" r="92" fill="url(#glow)"/><ellipse cx="100" cy="190" rx="118" ry="30" fill="url(#floor)"/><ellipse cx="100" cy="${FLOOR_Y}" rx="94" ry="12" fill="url(#stage)"/>${props}<ellipse cx="${f1(sx)}" cy="${FLOOR_Y}" rx="${f1(srx)}" ry="${f1(Math.max(4, srx * 0.2))}" fill="url(#shadow)" opacity="${f1(so)}"/>${groups}`;
}
