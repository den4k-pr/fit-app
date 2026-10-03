import sharp from 'sharp';

/**
 * «Розкадровка» для AI: кадри вправи складаються в сітки (як розкадровка фільму), щоб модель бачила РУХ —
 * різницю між сусідніми моментами, — а не оцінювала кожне фото окремо (окремий кадр повторюваної вправи
 * часто показує «паузу між повторами», і поштучна оцінка хибно каже «руху немає»).
 *
 * Сітка 4×2 клітинки по 240×320: 960×640 px — OpenAI не зменшує таке зображення (коротка сторона < 768),
 * тож кожен кадр лишається чітким, а одна сітка коштує фіксовано ~765 токенів. 24 кадри = 3 сітки — дешевше
 * за 12 окремих фото.
 */
export const SHEET_COLS = 4;
export const SHEET_ROWS = 2;
export const FRAMES_PER_SHEET = SHEET_COLS * SHEET_ROWS;
const CELL_W = 240;
const CELL_H = 320;
const GAP = 4;

export interface StoryboardSheet {
  /** JPEG сітки */
  image: Buffer;
  /** Які кадри в сітці (номери з 1) і їхні секунди — у порядку зліва направо, згори вниз */
  frames: { index: number; second: number }[];
}

export async function buildStoryboard(
  frames: Buffer[],
  times: number[],
): Promise<StoryboardSheet[]> {
  const sheets: StoryboardSheet[] = [];
  for (let start = 0; start < frames.length; start += FRAMES_PER_SHEET) {
    const chunk = frames.slice(start, start + FRAMES_PER_SHEET);
    const rows = Math.ceil(chunk.length / SHEET_COLS);
    const cells = await Promise.all(
      chunk.map((buf) =>
        sharp(buf)
          .rotate() // орієнтація з EXIF (фронтальна камера)
          .resize(CELL_W, CELL_H, { fit: 'cover' })
          .jpeg({ quality: 82 })
          .toBuffer(),
      ),
    );
    const image = await sharp({
      create: {
        width: SHEET_COLS * CELL_W + (SHEET_COLS + 1) * GAP,
        height: rows * CELL_H + (rows + 1) * GAP,
        channels: 3,
        background: { r: 24, g: 24, b: 24 },
      },
    })
      .composite(
        cells.map((input, i) => ({
          input,
          left: GAP + (i % SHEET_COLS) * (CELL_W + GAP),
          top: GAP + Math.floor(i / SHEET_COLS) * (CELL_H + GAP),
        })),
      )
      .jpeg({ quality: 80 })
      .toBuffer();
    sheets.push({
      image,
      frames: chunk.map((_, i) => ({
        index: start + i + 1,
        second: times[start + i] ?? start + i,
      })),
    });
  }
  return sheets;
}

/** Відрізок вправи, який модель оцінює цілком: «чи був у цьому відрізку рух вправи?» */
export interface TimeWindow {
  fromSec: number;
  toSec: number;
  /** Номери кадрів (з 1), що входять у відрізок */
  firstFrame: number;
  lastFrame: number;
}

/** Відрізки по ~`windowSec` секунд; хвіст з одного кадру приєднується до попереднього відрізка */
export function buildWindows(times: number[], windowSec = 6): TimeWindow[] {
  const windows: TimeWindow[] = [];
  times.forEach((t, i) => {
    const last = windows.at(-1);
    if (last && t - last.fromSec < windowSec) {
      last.toSec = t;
      last.lastFrame = i + 1;
    } else {
      windows.push({ fromSec: t, toSec: t, firstFrame: i + 1, lastFrame: i + 1 });
    }
  });
  const tail = windows.at(-1);
  if (windows.length > 1 && tail && tail.firstFrame === tail.lastFrame) {
    windows.pop();
    const prev = windows[windows.length - 1];
    prev.toSec = tail.toSec;
    prev.lastFrame = tail.lastFrame;
  }
  return windows;
}
