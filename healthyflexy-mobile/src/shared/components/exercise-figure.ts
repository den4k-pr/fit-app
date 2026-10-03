/**
 * Геометрія людської фігури для анімації вправ (worklet-функції: рахуються на UI-потоці й у Node-перевірці).
 * Кінцівки — конусні форми з рельєфом м'язів (стегно звужується до коліна, литка, передпліччя), тулуб,
 * таз у штанях, кросівки, долоні; голова — овал із волоссям, вухом, носом і оком.
 * Координати — полотно 200×200 (див. constants/exercise-animations.ts); таз — out[16..17], шия — out[2..3].
 */

/**
 * Округлення координат для шляху SVG. ОБОВ'ЯЗКОВО worklet: його викликають функції нижче на UI-потоці —
 * виклик звичайної функції звідти на телефоні валить застосунок (у web-збірці цього не видно).
 */
function r1(v: number): number {
  'worklet';
  return Math.round(v * 10) / 10;
}

/**
 * Конус між двома суглобами: коло радіуса ra в A, rb у B, спільні дотичні; `bulge` — опуклість м'яза
 * посередині. Порожній рядок, якщо кістка вироджена.
 */
export function limbPath(ax: number, ay: number, bx: number, by: number, ra: number, rb: number, bulge: number): string {
  'worklet';
  const dx = bx - ax;
  const dy = by - ay;
  const d = Math.hypot(dx, dy);
  if (d < 0.5) {
    const r = Math.max(ra, rb);
    return `M${r1(ax - r)} ${r1(ay)}A${r1(r)} ${r1(r)} 0 1 0 ${r1(ax + r)} ${r1(ay)}A${r1(r)} ${r1(r)} 0 1 0 ${r1(ax - r)} ${r1(ay)}Z`;
  }
  const ux = dx / d;
  const uy = dy / d;
  const nx = -uy;
  const ny = ux;
  const c = Math.max(-0.95, Math.min(0.95, (ra - rb) / d));
  const s = Math.sqrt(1 - c * c);
  // точки дотику: кут від осі кістки
  const pax = ax + ra * (ux * c + nx * s);
  const pay = ay + ra * (uy * c + ny * s);
  const pbx = bx + rb * (ux * c + nx * s);
  const pby = by + rb * (uy * c + ny * s);
  const qax = ax + ra * (ux * c - nx * s);
  const qay = ay + ra * (uy * c - ny * s);
  const qbx = bx + rb * (ux * c - nx * s);
  const qby = by + rb * (uy * c - ny * s);
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const mr = (ra + rb) / 2 + bulge * 2;
  return (
    `M${r1(pax)} ${r1(pay)}` +
    `Q${r1(mx + nx * mr)} ${r1(my + ny * mr)} ${r1(pbx)} ${r1(pby)}` +
    `A${r1(rb)} ${r1(rb)} 0 0 0 ${r1(qbx)} ${r1(qby)}` +
    `Q${r1(mx - nx * mr)} ${r1(my - ny * mr)} ${r1(qax)} ${r1(qay)}` +
    `A${r1(ra)} ${r1(ra)} 0 1 0 ${r1(pax)} ${r1(pay)}Z`
  );
}

/** Точка на відрізку pose[a] → pose[b] (t = 0…1); `drop` — зсув уздовж хребта вниз (плечовий суглоб) */
export function jointAt(pose: number[], a: number, b: number, t: number, drop: number): [number, number] {
  'worklet';
  let x = pose[a * 2] + (pose[b * 2] - pose[a * 2]) * t;
  let y = pose[a * 2 + 1] + (pose[b * 2 + 1] - pose[a * 2 + 1]) * t;
  if (drop > 0) {
    const sx = pose[16] - pose[2];
    const sy = pose[17] - pose[3];
    const sl = Math.hypot(sx, sy) || 1;
    x += (sx / sl) * drop * (1 - t);
    y += (sy / sl) * drop * (1 - t);
  }
  return [x, y];
}

/** Частина кінцівки між t0 і t1 (рукав — верхня частина плеча) */
export function segmentPath(
  pose: number[],
  a: number,
  b: number,
  t0: number,
  t1: number,
  ra: number,
  rb: number,
  bulge: number,
  drop: number,
): string {
  'worklet';
  if (pose.length === 0) return '';
  const p = jointAt(pose, a, b, t0, drop);
  const q = jointAt(pose, a, b, t1, drop);
  return limbPath(p[0], p[1], q[0], q[1], ra, rb, bulge);
}

/** Кросівок: від п'яти (трохи позаду щиколотки) до носка, товща п'ята, заокруглений носок */
export function shoePath(pose: number[], an: number, to: number, scale: number): string {
  'worklet';
  if (pose.length === 0) return '';
  const ax = pose[an * 2];
  const ay = pose[an * 2 + 1];
  const tx = pose[to * 2];
  const ty = pose[to * 2 + 1];
  const d = Math.hypot(tx - ax, ty - ay) || 1;
  const ux = (tx - ax) / d;
  const uy = (ty - ay) / d;
  const hx = ax - ux * 2.5;
  const hy = ay - uy * 2.5;
  return limbPath(hx, hy, tx + ux * 1.5, ty + uy * 1.5, 4.3 * scale, 3.1 * scale, 0.2);
}

/** Долоня: продовження передпліччя за зап'ястя */
export function handPath(pose: number[], el: number, ha: number, scale: number): string {
  'worklet';
  if (pose.length === 0) return '';
  const hx = pose[ha * 2];
  const hy = pose[ha * 2 + 1];
  const d = Math.hypot(hx - pose[el * 2], hy - pose[el * 2 + 1]) || 1;
  const ux = (hx - pose[el * 2]) / d;
  const uy = (hy - pose[el * 2 + 1]) / d;
  return limbPath(hx - ux * 1, hy - uy * 1, hx + ux * 5, hy + uy * 5, 3.3 * scale, 2.8 * scale, 0.3);
}

/** Таз (штани): вид збоку — овал уздовж хребта; спереду — від кульшового суглоба до кульшового */
export function hipsPath(pose: number[], front: boolean): string {
  'worklet';
  if (pose.length === 0) return '';
  const px = pose[16];
  const py = pose[17];
  let ux = pose[2] - px;
  let uy = pose[3] - py;
  const ul = Math.hypot(ux, uy) || 1;
  ux /= ul;
  uy /= ul;
  if (front) {
    return limbPath(pose[18], pose[19], pose[20], pose[21], 9, 9, 0.4);
  }
  // від талії трохи вниз за таз — сідниці й низ живота
  return limbPath(px + ux * 6, py + uy * 6, px - ux * 2, py - uy * 2, 9.5, 8.6, 0.3);
}

/** Точки еліпса (центр, піввісі a — уздовж `ax,ay`, b — уздовж `bx,by`) як шлях із 4 кубічних дуг */
function ellipse(cx: number, cy: number, ax: number, ay: number, bx: number, by: number, a: number, b: number): string {
  'worklet';
  const k = 0.5523;
  const P = (ca: number, cb: number) => `${r1(cx + ax * a * ca + bx * b * cb)} ${r1(cy + ay * a * ca + by * b * cb)}`;
  return (
    `M${P(1, 0)}` +
    `C${P(1, k)} ${P(k, 1)} ${P(0, 1)}` +
    `C${P(-k, 1)} ${P(-1, k)} ${P(-1, 0)}` +
    `C${P(-1, -k)} ${P(-k, -1)} ${P(0, -1)}` +
    `C${P(k, -1)} ${P(1, -k)} ${P(1, 0)}Z`
  );
}

export interface HeadShapes {
  skin: string;
  hair: string;
  ear: string;
  nose: string;
  eye: string;
}

/**
 * Голова: `up` — від шиї до голови; обличчя — перпендикулярно (вид збоку: у бік руху, лежачи на спині — угору).
 * Вид спереду — симетричний овал, волосся зверху, двоє очей.
 */
export function headShapes(pose: number[], front: boolean, supine: boolean): HeadShapes {
  'worklet';
  if (pose.length === 0) return { skin: '', hair: '', ear: '', nose: '', eye: '' };
  const cx = pose[0];
  const cy = pose[1];
  let ux = cx - pose[2];
  let uy = cy - pose[3];
  const ul = Math.hypot(ux, uy) || 1;
  ux /= ul;
  uy /= ul;
  // «вперед» (обличчя): поворот up на 90°; лежачи на спині — у протилежний бік
  const sign = supine ? -1 : 1;
  const fx = -uy * sign;
  const fy = ux * sign;
  const A = 10;
  const B = 12;

  if (front) {
    const skin = ellipse(cx, cy, fx, fy, ux, uy, A, B);
    // волосся: верхня «шапочка»
    const hairPts: string[] = [];
    for (let i = 0; i <= 12; i += 1) {
      const th = Math.PI * (-0.08 + (1.16 * i) / 12);
      hairPts.push(`${r1(cx + fx * (A + 0.8) * Math.cos(th) + ux * (B + 0.8) * Math.sin(th))} ${r1(cy + fy * (A + 0.8) * Math.cos(th) + uy * (B + 0.8) * Math.sin(th))}`);
    }
    for (let i = 12; i >= 0; i -= 1) {
      const th = Math.PI * (-0.08 + (1.16 * i) / 12);
      const inner = 0.45 + 0.2 * Math.sin(th);
      hairPts.push(`${r1(cx + fx * A * Math.cos(th) * 0.96 + ux * B * inner * Math.sin(th) + ux * 2)} ${r1(cy + fy * A * Math.cos(th) * 0.96 + uy * B * inner * Math.sin(th) + uy * 2)}`);
    }
    const ear =
      ellipse(cx + fx * (A - 0.5) - ux * 1, cy + fy * (A - 0.5) - uy * 1, fx, fy, ux, uy, 2, 3.2) +
      ellipse(cx - fx * (A - 0.5) - ux * 1, cy - fy * (A - 0.5) - uy * 1, fx, fy, ux, uy, 2, 3.2);
    const eye =
      ellipse(cx + fx * 3.6 - ux * 0.5, cy + fy * 3.6 - uy * 0.5, fx, fy, ux, uy, 1.1, 1.3) +
      ellipse(cx - fx * 3.6 - ux * 0.5, cy - fy * 3.6 - uy * 0.5, fx, fy, ux, uy, 1.1, 1.3);
    return { skin, hair: `M${hairPts.join('L')}Z`, ear, nose: '', eye };
  }

  // профіль: череп трохи зміщений назад, щелепа — вперед-вниз
  const ccx = cx - fx * 0.5;
  const ccy = cy - fy * 0.5;
  const skull = ellipse(ccx, ccy, fx, fy, ux, uy, A, B);
  const jaw = ellipse(cx + fx * 3.5 - ux * 5, cy + fy * 3.5 - uy * 5, fx, fy, ux, uy, 6, 5.5);
  // волосся: верх і потилиця
  const hairPts: string[] = [];
  // зовнішній край — від чола (50°) через маківку до потилиці (215°); внутрішній — лінія росту волосся
  for (let i = 0; i <= 16; i += 1) {
    const th = (Math.PI * (50 + (165 * i) / 16)) / 180;
    hairPts.push(`${r1(ccx + fx * (A + 1.2) * Math.cos(th) + ux * (B + 1.2) * Math.sin(th))} ${r1(ccy + fy * (A + 1.2) * Math.cos(th) + uy * (B + 1.2) * Math.sin(th))}`);
  }
  for (let i = 16; i >= 0; i -= 1) {
    const th = (Math.PI * (50 + (165 * i) / 16)) / 180;
    // спереду тонка смужка (чубчик), на маківці й потилиці — густіше
    const k = th < Math.PI * 0.55 ? 0.78 : 0.55;
    hairPts.push(`${r1(ccx + fx * A * k * Math.cos(th) + ux * (B * k * Math.sin(th) + 1.5))} ${r1(ccy + fy * A * k * Math.cos(th) + uy * (B * k * Math.sin(th) + 1.5))}`);
  }
  const nose =
    `M${r1(cx + fx * (A - 1.2) + ux * 1.5)} ${r1(cy + fy * (A - 1.2) + uy * 1.5)}` +
    `Q${r1(cx + fx * (A + 2.6) - ux * 0.8)} ${r1(cy + fy * (A + 2.6) - uy * 0.8)} ${r1(cx + fx * (A - 1) - ux * 2.6)} ${r1(cy + fy * (A - 1) - uy * 2.6)}Z`;
  const ear = ellipse(ccx - fx * 2.8 - ux * 1.5, ccy - fy * 2.8 - uy * 1.5, fx, fy, ux, uy, 2.2, 3.2);
  const eye = ellipse(cx + fx * 6 + ux * 1.6, cy + fy * 6 + uy * 1.6, fx, fy, ux, uy, 1.1, 1.3);
  return { skin: skull + jaw, hair: `M${hairPts.join('L')}Z`, ear, nose, eye };
}

// ───── світло й деталі (циліндрична тінь уздовж кожної кінцівки, шви, лампаси, підошва) ─────

/**
 * Нормаль до осі A→B, повернута В БІК СВІТЛА (світло зверху зліва: -0.55, -0.83).
 * Тінь і відблиск кладуться вздовж осі кінцівки — як на справжньому циліндрі, під будь-яким кутом.
 */
export function lightNormal(ax: number, ay: number, bx: number, by: number): [number, number] {
  'worklet';
  const d = Math.hypot(bx - ax, by - ay);
  if (d < 1e-3) return [-0.55, -0.83];
  let nx = -(by - ay) / d;
  let ny = (bx - ax) / d;
  if (nx * -0.55 + ny * -0.83 < 0) {
    nx = -nx;
    ny = -ny;
  }
  return [nx, ny];
}

/**
 * Тіньовий бік форми: вужчий конус, зсунутий від світла на `off`·r, радіус `rad`·r (межа не виходить за
 * силует). Кінцівки — 0.42 / 0.56; широкий тулуб — лише смуга біля краю (0.62 / 0.36), інакше різка межа
 * посередині виглядала б як двоколірна футболка.
 */
export function shadeOf(ax: number, ay: number, bx: number, by: number, ra: number, rb: number, off: number, rad: number): string {
  'worklet';
  const n = lightNormal(ax, ay, bx, by);
  return limbPath(ax - n[0] * ra * off, ay - n[1] * ra * off, bx - n[0] * rb * off, by - n[1] * rb * off, ra * rad, rb * rad, 0);
}

/** Відблиск: тонка смужка з боку світла, коротша за кінцівку */
export function highlightOf(ax: number, ay: number, bx: number, by: number, ra: number, rb: number): string {
  'worklet';
  const n = lightNormal(ax, ay, bx, by);
  const sx = ax + (bx - ax) * 0.14;
  const sy = ay + (by - ay) * 0.14;
  const ex = ax + (bx - ax) * 0.8;
  const ey = ay + (by - ay) * 0.8;
  return limbPath(sx + n[0] * ra * 0.46, sy + n[1] * ra * 0.46, ex + n[0] * rb * 0.46, ey + n[1] * rb * 0.46, ra * 0.2, rb * 0.2, 0);
}

/** Лінія вздовж кінцівки, зсунута до світла на частку радіуса (лампас на штанях) */
export function stripeOf(ax: number, ay: number, bx: number, by: number, ra: number, rb: number, k: number): string {
  'worklet';
  const n = lightNormal(ax, ay, bx, by);
  const sx = ax + (bx - ax) * 0.04 + n[0] * ra * k;
  const sy = ay + (by - ay) * 0.04 + n[1] * ra * k;
  const ex = ax + (bx - ax) * 0.96 + n[0] * rb * k;
  const ey = ay + (by - ay) * 0.96 + n[1] * rb * k;
  return `M${r1(sx)} ${r1(sy)}L${r1(ex)} ${r1(ey)}`;
}

/** Шов поперек кінцівки в точці t (край рукава) */
export function seamAcross(ax: number, ay: number, bx: number, by: number, t: number, r: number): string {
  'worklet';
  const d = Math.hypot(bx - ax, by - ay) || 1;
  const nx = -(by - ay) / d;
  const ny = (bx - ax) / d;
  const px = ax + (bx - ax) * t;
  const py = ay + (by - ay) * t;
  return `M${r1(px + nx * r)} ${r1(py + ny * r)}L${r1(px - nx * r)} ${r1(py - ny * r)}`;
}

/** Підошва кросівка: смужка вздовж нижнього (ближчого до підлоги) краю */
export function soleOf(pose: number[], an: number, to: number, scale: number): string {
  'worklet';
  if (pose.length === 0) return '';
  const ax = pose[an * 2];
  const ay = pose[an * 2 + 1];
  const tx = pose[to * 2];
  const ty = pose[to * 2 + 1];
  const d = Math.hypot(tx - ax, ty - ay) || 1;
  const ux = (tx - ax) / d;
  const uy = (ty - ay) / d;
  let nx = -uy;
  let ny = ux;
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const o = 3.3 * scale;
  return `M${r1(ax - ux * 3.5 + nx * o)} ${r1(ay - uy * 3.5 + ny * o)}L${r1(tx + ux * 2.2 + nx * o * 0.8)} ${r1(ty + uy * 2.2 + ny * o * 0.8)}`;
}

export interface FaceDetails {
  /** Брови (колір волосся), рот (темніша шкіра), відблиск на волоссі */
  brow: string;
  mouth: string;
  shine: string;
}

export function faceDetails(pose: number[], front: boolean, supine: boolean): FaceDetails {
  'worklet';
  if (pose.length === 0) return { brow: '', mouth: '', shine: '' };
  const cx = pose[0];
  const cy = pose[1];
  let ux = cx - pose[2];
  let uy = cy - pose[3];
  const ul = Math.hypot(ux, uy) || 1;
  ux /= ul;
  uy /= ul;
  const sign = supine ? -1 : 1;
  const fx = -uy * sign;
  const fy = ux * sign;
  const P = (f: number, u: number) => `${r1(cx + fx * f + ux * u)} ${r1(cy + fy * f + uy * u)}`;
  if (front) {
    return {
      brow: `M${P(-5.6, 3.6)}Q${P(-3.6, 4.6)} ${P(-1.8, 3.8)}M${P(1.8, 3.8)}Q${P(3.6, 4.6)} ${P(5.6, 3.6)}`,
      mouth: `M${P(-2.4, -5.2)}Q${P(0, -6.6)} ${P(2.4, -5.2)}`,
      shine: `M${P(-6.5, 8.5)}Q${P(-3, 11.6)} ${P(1.5, 11.8)}`,
    };
  }
  const ccf = -0.5;
  return {
    brow: `M${P(4.2, 3.9)}Q${P(5.8, 4.8)} ${P(7.6, 4.3)}`,
    mouth: `M${P(7.2, -5.6)}Q${P(8.2, -6.1)} ${P(8.9, -5.4)}`,
    shine: `M${P(ccf - 1, 11.4)}Q${P(ccf - 5.5, 10.8)} ${P(ccf - 8.6, 7.2)}`,
  };
}
