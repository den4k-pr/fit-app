import { ConfigService } from '@nestjs/config';
import { AppLanguage } from '../../common/enums';
import sharp from 'sharp';
import { AiAnalysisResult, AiVisionProvider } from './ai-provider.interface';
import { AiService } from './ai.service';
import { issuesFromWindows, parseAnalysisResult } from './providers/openai-vision.provider';
import { buildStoryboard, buildWindows } from './storyboard';

const config = { get: () => 60 } as unknown as ConfigService;
const service = new AiService({} as AiVisionProvider, config as never);

const good: AiAnalysisResult = {
  isCorrect: true,
  score: 85,
  feedback: 'Добре',
  recommendations: 'Так тримати',
  framesAnalyzed: 24,
  personVisibleFrames: 24,
  windowsPerformed: 5,
  windowsTotal: 5,
  movementDetected: true,
  matchesExercise: true,
  issues: [],
};

describe('AiService.accepts: сувора перевірка вердикту', () => {
  it('приймає, коли всі умови виконані', () => {
    expect(service.accepts(good, true)).toBe(true);
  });

  it('відхиляє, якщо людини не видно в більшості кадрів', () => {
    expect(service.accepts({ ...good, personVisibleFrames: 0 }, true)).toBe(false);
    expect(service.accepts({ ...good, personVisibleFrames: 11 }, true)).toBe(false);
    expect(service.accepts({ ...good, personVisibleFrames: 12 }, true)).toBe(true);
  });

  it('відхиляє, якщо рух був менш ніж у половині відрізків', () => {
    expect(service.accepts({ ...good, windowsPerformed: 2 }, true)).toBe(false);
    expect(service.accepts({ ...good, windowsPerformed: 3 }, true)).toBe(true);
  });

  it('відхиляє іншу вправу, відсутність руху, низький score', () => {
    expect(service.accepts({ ...good, matchesExercise: false }, true)).toBe(false);
    expect(service.accepts({ ...good, movementDetected: false }, true)).toBe(false);
    expect(service.accepts({ ...good, score: 59 }, true)).toBe(false);
    expect(service.accepts({ ...good, isCorrect: false, score: 60 }, true)).toBe(false);
  });

  it('isCorrect=false при впевненій оцінці не блокує (віджимання від підлоги замість опори, оцінка 70)', () => {
    expect(service.accepts({ ...good, isCorrect: false, score: 70 }, true)).toBe(true);
    expect(service.accepts({ ...good, isCorrect: false, score: 64 }, true)).toBe(false);
  });

  it('для спокійних вправ (дихання) рух не обовʼязковий', () => {
    expect(service.accepts({ ...good, movementDetected: false, windowsPerformed: 0 }, false)).toBe(
      true,
    );
  });
});

describe('buildWindows: відрізки ~6 с', () => {
  it('24 кадри за 30 с → 5 відрізків, хвіст з одного кадру приєднано', () => {
    const times = Array.from({ length: 24 }, (_, i) => Math.round(1 + i * 1.2));
    const windows = buildWindows(times);
    expect(windows[0]).toMatchObject({ fromSec: 1, firstFrame: 1 });
    expect(windows.at(-1)?.lastFrame).toBe(24);
    expect(windows.every((w) => w.lastFrame > w.firstFrame)).toBe(true);
    expect(windows.length).toBeGreaterThanOrEqual(4);
    expect(windows.length).toBeLessThanOrEqual(6);
  });
});

describe('issuesFromWindows: пояснення відмови за часом', () => {
  const w = (fromSec: number, toSec: number) => ({ fromSec, toSec, firstFrame: 1, lastFrame: 2 });

  it('склеює сусідні невиконані відрізки з однією причиною; виконані розривають', () => {
    expect(
      issuesFromWindows([
        { window: w(1, 6), performed: true, issue: '' },
        { window: w(7, 12), performed: false, issue: 'Ноги не піднімалися' },
        { window: w(13, 18), performed: false, issue: 'ноги не піднімалися' },
        { window: w(19, 24), performed: true, issue: '' },
        { window: w(25, 30), performed: false, issue: '' },
      ]),
    ).toEqual([
      { fromSec: 7, toSec: 18, reason: 'Ноги не піднімалися' },
      { fromSec: 25, toSec: 30, reason: 'Рух вправи не виконувався' },
    ]);
  });
});

describe('parseAnalysisResult', () => {
  const windows = [
    { fromSec: 1, toSec: 6, firstFrame: 1, lastFrame: 5 },
    { fromSec: 7, toSec: 12, firstFrame: 6, lastFrame: 10 },
  ];
  const raw = (extra: object) =>
    JSON.stringify({
      personVisibleFrames: 10,
      windows: [{ performed: true, issue: '' }],
      movementDetected: true,
      matchesExercise: true,
      isCorrect: true,
      score: 90,
      feedback: 'ok',
      recommendations: 'ok',
      ...extra,
    });

  it('неоцінений моделлю відрізок = невиконаний', () => {
    const r = parseAnalysisResult(raw({}), 10, windows);
    expect(r).toMatchObject({ windowsPerformed: 1, windowsTotal: 2, personVisibleFrames: 10 });
    expect(r.issues).toEqual([{ fromSec: 7, toSec: 12, reason: 'Рух вправи не виконувався' }]);
  });

  it('кидає помилку на неповну відповідь (не трактує її як «правильно»)', () => {
    expect(() => parseAnalysisResult('{"isCorrect": true}', 10, windows)).toThrow();
    expect(() => parseAnalysisResult('not json', 10, windows)).toThrow();
  });
});

describe('buildStoryboard: розкадровка', () => {
  it('24 кадри → 3 сітки 4×2 розміром ~960×640, номери й секунди по порядку', async () => {
    const frame = await sharp({
      create: { width: 360, height: 480, channels: 3, background: { r: 200, g: 120, b: 80 } },
    })
      .jpeg()
      .toBuffer();
    const times = Array.from({ length: 24 }, (_, i) => i + 1);
    const sheets = await buildStoryboard(Array(24).fill(frame) as Buffer[], times);
    expect(sheets).toHaveLength(3);
    const meta = await sharp(sheets[0].image).metadata();
    expect(meta).toMatchObject({ width: 980, height: 652, format: 'jpeg' });
    expect(sheets[2].frames.at(-1)).toEqual({ index: 24, second: 24 });
  });
});

describe('мова відгуку AI', () => {
  const windows = [{ fromSec: 1, toSec: 6, firstFrame: 1, lastFrame: 5 }];
  const raw = JSON.stringify({
    personVisibleFrames: 5,
    windows: [{ performed: false, issue: '' }],
    movementDetected: false,
    matchesExercise: true,
    isCorrect: false,
    score: 10,
    feedback: 'x',
    recommendations: 'y',
  });

  it('причина за замовчуванням — мовою виконавця', () => {
    expect(parseAnalysisResult(raw, 5, windows, AppLanguage.RU).issues[0].reason).toBe(
      'Движение упражнения не выполнялось',
    );
    expect(parseAnalysisResult(raw, 5, windows, AppLanguage.EN).issues[0].reason).toBe(
      'The exercise movement was not performed',
    );
    expect(parseAnalysisResult(raw, 5, windows).issues[0].reason).toBe('Рух вправи не виконувався');
  });
});
