import sharp from 'sharp';
import { precheckFrames } from './frame-precheck';

const scene = async (figureTop: number, background = { r: 170, g: 150, b: 130 }) => {
  const figure = await sharp({
    create: { width: 90, height: 200, channels: 3, background: { r: 40, g: 40, b: 50 } },
  })
    .png()
    .toBuffer();
  return sharp({ create: { width: 360, height: 480, channels: 3, background } })
    .composite([{ input: figure, left: 135, top: figureTop }])
    .jpeg({ quality: 80 })
    .toBuffer();
};

describe('precheckFrames: безкоштовна перевірка перед AI', () => {
  it('однакові кадри у вправі з рухом → static', async () => {
    const frame = await scene(120);
    const result = await precheckFrames(Array<Buffer>(12).fill(frame), true);
    expect(result.problem).toBe('static');
  });

  it('утримання (планка) без руху — НЕ відхиляється', async () => {
    const frame = await scene(120);
    expect((await precheckFrames(Array<Buffer>(12).fill(frame), false)).problem).toBeNull();
  });

  it('повільний рух малої амплітуди (зсув на ~25 px з 480) — НЕ відхиляється', async () => {
    const frames = await Promise.all(
      Array.from({ length: 12 }, (_, i) => scene(120 + (i % 2) * 25)),
    );
    const result = await precheckFrames(frames, true);
    expect(result.problem).toBeNull();
  });

  it('темні кадри (камеру закрито) → dark', async () => {
    const dark = await scene(120, { r: 5, g: 5, b: 5 });
    const frames = Array<Buffer>(12).fill(dark);
    expect((await precheckFrames(frames, false)).problem).toBe('dark');
  });
});
