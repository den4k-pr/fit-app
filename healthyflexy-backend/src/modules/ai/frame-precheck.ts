import sharp from 'sharp';
import { AppLanguage } from '../../common/enums';

/**
 * Безкоштовна перевірка кадрів ДО платного AI-аналізу. Відсікає лише ЗАВІДОМО порожні спроби, які модель
 * однаково відхилила б (і взяла б за це гроші): камеру закрито / темно, або на всіх кадрах нічого не рухається
 * у вправі, де рух обов'язковий. Пороги свідомо обережні: справжня спроба (навіть повільна, з малою амплітудою)
 * дає зміни між кадрами в рази більші за шум камери, тож точність перевірки виконання не страждає.
 */

/** Розмір мініатюри для порівняння (сірий 32×32) */
const SIDE = 32;
/** Середня яскравість кадру (0–255), нижче — «темно / камеру закрито» */
const DARK_LEVEL = 18;
/** Частка темних кадрів, з якої спроба вважається порожньою */
const DARK_SHARE = 0.6;
/**
 * Середня зміна пікселя між кадрами (0–255). Шум нерухомої камери — ~0.5–1.5; людина в русі — 6+.
 * «Нерухомо» лише коли і сусідні кадри, і перший з будь-яким іншим майже однакові.
 */
const STATIC_NEIGHBOUR = 1.5;
const STATIC_OVERALL = 2.5;

export type PrecheckProblem = 'dark' | 'static';

export interface PrecheckResult {
  problem: PrecheckProblem | null;
  /** Для логу: середня яскравість і найбільша зміна між кадрами */
  brightness: number;
  maxChange: number;
}

async function tiny(frame: Buffer): Promise<Uint8Array> {
  const { data } = await sharp(frame)
    .rotate()
    .resize(SIDE, SIDE, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return new Uint8Array(data.buffer, data.byteOffset, data.length);
}

const mean = (a: Uint8Array) => a.reduce((s, v) => s + v, 0) / a.length;
const change = (a: Uint8Array, b: Uint8Array) => {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
};

export async function precheckFrames(
  frames: Buffer[],
  requiresMovement: boolean,
): Promise<PrecheckResult> {
  const thumbs = await Promise.all(frames.map(tiny));
  const levels = thumbs.map(mean);
  const brightness = levels.reduce((s, v) => s + v, 0) / Math.max(1, levels.length);
  let maxNeighbour = 0;
  let maxOverall = 0;
  for (let i = 1; i < thumbs.length; i += 1) {
    maxNeighbour = Math.max(maxNeighbour, change(thumbs[i - 1], thumbs[i]));
    maxOverall = Math.max(maxOverall, change(thumbs[0], thumbs[i]));
  }
  const maxChange = Math.max(maxNeighbour, maxOverall);
  const darkShare = levels.filter((l) => l < DARK_LEVEL).length / Math.max(1, levels.length);
  if (darkShare >= DARK_SHARE) return { problem: 'dark', brightness, maxChange };
  if (requiresMovement && maxNeighbour < STATIC_NEIGHBOUR && maxOverall < STATIC_OVERALL)
    return { problem: 'static', brightness, maxChange };
  return { problem: null, brightness, maxChange };
}

/** Відгук для людини (мовою виконавця) — замість відповіді моделі */
export const PRECHECK_FEEDBACK: Record<
  PrecheckProblem,
  Record<AppLanguage, { feedback: string; recommendations: string }>
> = {
  dark: {
    [AppLanguage.UK]: {
      feedback: 'Камеру майже нічого не видно — схоже, вона закрита або в кімнаті темно.',
      recommendations:
        'Увімкніть світло й поставте телефон так, щоб вас було видно на повний зріст.',
    },
    [AppLanguage.RU]: {
      feedback: 'Камере почти ничего не видно — похоже, она закрыта или в комнате темно.',
      recommendations: 'Включите свет и поставьте телефон так, чтобы вас было видно в полный рост.',
    },
    [AppLanguage.PL]: {
      feedback: 'Kamera prawie nic nie widzi — chyba jest zasłonięta albo w pokoju jest ciemno.',
      recommendations: 'Włącz światło i ustaw telefon tak, by było Cię widać w całości.',
    },
    [AppLanguage.EN]: {
      feedback: 'The camera can barely see anything — it may be covered or the room is dark.',
      recommendations: 'Turn on the light and place the phone so your whole body is visible.',
    },
  },
  static: {
    [AppLanguage.UK]: {
      feedback: 'Рух не видно: увесь час кадр не змінювався.',
      recommendations: 'Відійдіть так, щоб вас було видно повністю, і повторюйте рух за відео.',
    },
    [AppLanguage.RU]: {
      feedback: 'Движение не видно: все время кадр не менялся.',
      recommendations:
        'Отойдите так, чтобы вас было видно полностью, и повторяйте движение за видео.',
    },
    [AppLanguage.PL]: {
      feedback: 'Nie widać ruchu: przez cały czas obraz się nie zmieniał.',
      recommendations: 'Odsuń się tak, by było Cię widać w całości, i powtarzaj ruch za wideo.',
    },
    [AppLanguage.EN]: {
      feedback: 'No movement was visible: the picture did not change the whole time.',
      recommendations:
        'Step back so your whole body is visible and copy the movement from the video.',
    },
  },
};
