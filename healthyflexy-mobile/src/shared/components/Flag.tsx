import Svg, { ClipPath, Defs, G, Rect } from 'react-native-svg';

const FLAGS = {
  PL: ['#FFFFFF', '#DC143C'],
  UA: ['#0057B8', '#FFD700'],
} as const;
export type FlagCode = keyof typeof FLAGS;

/** Прапор у вигляді заокругленого прямокутника (замість емодзі-прапорів: однаково виглядає на всіх телефонах) */
export function Flag({ code, width = 34 }: { code: FlagCode; width?: number }) {
  const [top, bottom] = FLAGS[code];
  const height = Math.round(width * 0.7);
  return (
    <Svg width={width} height={height} viewBox="0 0 34 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <ClipPath id={`flag-${code}`}>
          <Rect width={34} height={24} rx={6} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#flag-${code})`}>
        <Rect width={34} height={12} fill={top} />
        <Rect y={12} width={34} height={12} fill={bottom} />
        <Rect width={34} height={24} rx={6} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
      </G>
    </Svg>
  );
}
