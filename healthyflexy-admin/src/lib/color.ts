import { DEFAULT_PALETTE, type Palette, type PalettePreset } from '@/data/palettes';

type RGB = [number, number, number];

export const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** Змішати колір `a` з `b`: amount 0 → a, 1 → b */
export function mix(a: string, b: string, amount: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * amount) as RGB);
}

export const darken = (hex: string, amount: number) => mix(hex, '#000000', amount);
export const lighten = (hex: string, amount: number) => mix(hex, '#FFFFFF', amount);

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Контраст WCAG (1–21) */
export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Уся палітра з двох базових кольорів: темного (шапка, меню) й акценту (кнопки, прогрес) */
export function derivePalette(dark: string, accent: string): Palette {
  let button = darken(accent, 0.1);
  // білий текст на кнопці має читатися (≥ 3:1)
  for (let i = 0; i < 8 && contrast(button, '#FFFFFF') < 3.2; i++) button = darken(button, 0.08);
  const light = lighten(accent, 0.89);
  const borderAccent = lighten(accent, 0.66);
  return {
    forest: dark,
    deep: mix(dark, accent, 0.28),
    green: accent,
    greenDark: darken(accent, 0.2),
    greenButton: button,
    greenButtonBase: darken(button, 0.2),
    greenLight: light,
    greenBorder: borderAccent,
    mint: lighten(accent, 0.7),
    paper: lighten(accent, 0.965),
    shade: lighten(accent, 0.95),
    border: lighten(mix(accent, dark, 0.3), 0.82),
    cream: light,
    teal: darken(accent, 0.2),
    tealBg: light,
    tealBorder: borderAccent,
    pillGreenText: dark,
    ink: darken(dark, 0.55),
    soft: mix(dark, '#5A5A5A', 0.35),
    muted: lighten(mix(dark, '#808080', 0.4), 0.35),
  };
}

export function paletteOfPreset(preset: PalettePreset): Palette {
  return preset.id === 'forest' ? { ...DEFAULT_PALETTE } : derivePalette(preset.base.dark, preset.base.accent);
}
