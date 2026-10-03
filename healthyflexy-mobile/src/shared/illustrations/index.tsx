import type { ReactNode } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { colors } from '@/theme';

/**
 * Власні векторні ілюстрації в кольорах застосунку (ліс, папір, золото). Малюються кодом, без растрових картинок:
 * чіткі на будь-якому екрані, важать кілька КБ і не потребують завантаження.
 */
export interface IllustrationProps {
  /** Ширина, px; висота підбирається за пропорцією 200:170 */
  size?: number;
}

function Frame({ size = 200, children }: IllustrationProps & { children: ReactNode }) {
  return (
    <Svg width={size} height={Math.round(size * 0.85)} viewBox="0 0 200 170" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {children}
    </Svg>
  );
}

const SPARK = 'M0 -7 L1.9 -1.9 L7 0 L1.9 1.9 L0 7 L-1.9 1.9 L-7 0 L-1.9 -1.9 Z';
function Spark({ x, y, k = 1, fill = colors.gold, opacity = 1 }: { x: number; y: number; k?: number; fill?: string; opacity?: number }) {
  return <Path d={SPARK} transform={`translate(${x} ${y}) scale(${k})`} fill={fill} opacity={opacity} />;
}
function Backdrop({ tint = colors.shade }: { tint?: string }) {
  return (
    <>
      <Circle cx={100} cy={90} r={72} fill={tint} />
      <Circle cx={100} cy={90} r={54} fill={colors.cream} />
    </>
  );
}

/** Відкрита книжка з серцем: «Книжка турботи» */
export function WelcomeIllustration({ size }: IllustrationProps) {
  return (
    <Frame size={size}>
      <Backdrop />
      <Path d="M100 128 L100 76 C 82 66, 58 68, 44 74 L44 122 C 60 118, 84 118, 100 128 Z" fill={colors.surface} stroke={colors.border} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M100 128 L100 76 C 118 66, 142 68, 156 74 L156 122 C 140 118, 116 118, 100 128 Z" fill={colors.surface} stroke={colors.border} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M56 88 C 68 84, 80 86, 90 90 M56 100 C 68 96, 80 98, 90 102 M56 112 C 66 109, 78 110, 86 113" stroke={colors.goldSoft} strokeWidth={3.2} strokeLinecap="round" fill="none" />
      <Path d="M144 88 C 132 84, 120 86, 110 90 M144 100 C 132 96, 120 98, 110 102 M144 112 C 134 109, 122 110, 114 113" stroke={colors.goldSoft} strokeWidth={3.2} strokeLinecap="round" fill="none" />
      <Path d="M40 124 C 58 118, 84 120, 100 132 C 116 120, 142 118, 160 124 L160 132 C 142 126, 116 128, 100 140 C 84 128, 58 126, 40 132 Z" fill={colors.deep} />
      <Path d="M100 66 C 84 56, 82 38, 95 36 C 99 35.5, 100 40, 100 40 C 100 40, 101 35.5, 105 36 C 118 38, 116 56, 100 66 Z" fill={colors.gold} />
      <Path d="M56 56 C 58 42, 72 38, 82 42 C 80 54, 68 60, 56 56 Z" fill={colors.teal} />
      <Path d="M144 56 C 142 42, 128 38, 118 42 C 120 54, 132 60, 144 56 Z" fill={colors.teal} opacity={0.85} />
      <Spark x={34} y={64} k={1.1} />
      <Spark x={168} y={52} k={0.8} fill={colors.goldDark} />
      <Spark x={158} y={100} k={0.7} />
    </Frame>
  );
}

/** Людина з піднятими руками під сонцем: «щодня робите вправи» */
export function ExerciseIllustration({ size }: IllustrationProps) {
  return (
    <Frame size={size}>
      <Backdrop tint={colors.tealBg} />
      <Ellipse cx={100} cy={146} rx={48} ry={6} fill={colors.border} opacity={0.7} />
      <Circle cx={152} cy={46} r={13} fill={colors.gold} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <Line key={a} x1={152 + Math.cos((a * Math.PI) / 180) * 18} y1={46 + Math.sin((a * Math.PI) / 180) * 18} x2={152 + Math.cos((a * Math.PI) / 180) * 23} y2={46 + Math.sin((a * Math.PI) / 180) * 23} stroke={colors.goldSoft} strokeWidth={3} strokeLinecap="round" />
      ))}
      <Path d="M90 80 L66 54 M110 80 L134 54" stroke={colors.deep} strokeWidth={10} strokeLinecap="round" />
      <Path d="M94 112 L84 142 M106 112 L116 142" stroke={colors.deep} strokeWidth={11} strokeLinecap="round" />
      <Path d="M100 68 C 90 68 85 76 87 90 L89 114 L111 114 L113 90 C115 76 110 68 100 68 Z" fill={colors.forest} />
      <Circle cx={100} cy={54} r={12} fill={colors.forest} />
      <Ellipse cx={82} cy={144} rx={9} ry={4.5} fill={colors.gold} />
      <Ellipse cx={118} cy={144} rx={9} ry={4.5} fill={colors.gold} />
      <Path d="M44 118 C 46 104, 60 100, 68 104 C 66 116, 54 122, 44 118 Z" fill={colors.teal} />
      <Spark x={44} y={56} k={0.9} />
      <Spark x={170} y={100} k={0.7} fill={colors.goldDark} />
    </Frame>
  );
}

/** Стос монет із серцем: «турбота, яка винагороджується» */
export function RewardIllustration({ size }: IllustrationProps) {
  const coin = (y: number, key: number) => (
    <G key={key}>
      <Path d={`M62 ${y} v-9 a38 11 0 0 1 76 0 v9 a38 11 0 0 1 -76 0 z`} fill={colors.gold} stroke={colors.goldDark} strokeWidth={2} strokeLinejoin="round" />
      <Ellipse cx={100} cy={y - 9} rx={38} ry={11} fill={colors.goldSoft} stroke={colors.goldDark} strokeWidth={2} />
    </G>
  );
  return (
    <Frame size={size}>
      <Backdrop />
      {coin(140, 0)}
      {coin(126, 1)}
      {coin(112, 2)}
      <Circle cx={100} cy={70} r={27} fill={colors.gold} stroke={colors.goldDark} strokeWidth={2.5} />
      <Circle cx={100} cy={70} r={20} fill="none" stroke={colors.goldSoft} strokeWidth={2} strokeDasharray="3 4" />
      <Path d="M100 82 C 88 74, 87 62, 96 61 C 99 60.7, 100 64, 100 64 C 100 64, 101 60.7, 104 61 C 113 62, 112 74, 100 82 Z" fill={colors.onGold} />
      <Spark x={52} y={62} k={1} />
      <Spark x={152} y={54} k={1.2} />
      <Spark x={160} y={112} k={0.7} fill={colors.goldDark} />
      <Spark x={40} y={104} k={0.7} fill={colors.goldDark} />
    </Frame>
  );
}

/** Щит із галочкою: згода, приватність */
export function ShieldIllustration({ size }: IllustrationProps) {
  return (
    <Frame size={size}>
      <Backdrop tint={colors.tealBg} />
      <Path d="M100 30 L148 47 V88 C148 118 126 138 100 148 C74 138 52 118 52 88 V47 Z" fill={colors.deep} />
      <Path d="M100 40 L138 54 V88 C138 111 121 128 100 137 C79 128 62 111 62 88 V54 Z" fill={colors.teal} />
      <Path d="M79 90 L94 105 L123 73" stroke={colors.goldSoft} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Spark x={42} y={54} k={0.9} />
      <Spark x={162} y={64} k={0.8} fill={colors.goldDark} />
      <Spark x={158} y={124} k={0.6} />
    </Frame>
  );
}

/** Конверт із серцем: запрошення */
export function EnvelopeIllustration({ size }: IllustrationProps) {
  return (
    <Frame size={size}>
      <Backdrop />
      <Rect x={46} y={66} width={108} height={72} rx={12} fill={colors.surface} stroke={colors.border} strokeWidth={2.5} />
      <Path d="M48 74 C 70 92, 130 92, 152 74" stroke={colors.border} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Path d="M48 132 L84 102 M152 132 L116 102" stroke={colors.border} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={100} cy={96} r={15} fill={colors.gold} />
      <Path d="M100 104 C 92 98, 91 91, 97 90 C 99 89.8, 100 92, 100 92 C 100 92, 101 89.8, 103 90 C 109 91, 108 98, 100 104 Z" fill={colors.onGold} />
      <Path d="M132 52 C 134 44, 142 42, 147 46 C 146 54, 138 57, 132 52 Z" fill={colors.teal} />
      <Spark x={56} y={50} k={0.9} />
      <Spark x={166} y={84} k={0.7} fill={colors.goldDark} />
    </Frame>
  );
}

/** Сонце над пагорбами й пагін: день відпочинку */
export function RestIllustration({ size }: IllustrationProps) {
  return (
    <Frame size={size}>
      <Backdrop tint={colors.tealBg} />
      <Defs>
        <ClipPath id="restClip">
          <Circle cx={100} cy={90} r={54} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#restClip)">
        <Circle cx={100} cy={82} r={22} fill={colors.gold} />
        <Path d="M40 132 C 62 100, 88 100, 108 122 C 124 106, 146 108, 162 128 L162 160 L40 160 Z" fill={colors.teal} />
        <Path d="M40 146 C 66 122, 96 124, 118 142 C 134 130, 150 132, 162 142 L162 160 L40 160 Z" fill={colors.deep} />
      </G>
      <Path d="M100 140 L100 124" stroke={colors.goldSoft} strokeWidth={3} strokeLinecap="round" />
      <Path d="M100 128 C 92 128, 88 122, 90 116 C 97 116, 101 121, 100 128 Z" fill={colors.goldSoft} />
      <Path d="M100 124 C 108 124, 112 118, 110 112 C 103 112, 99 117, 100 124 Z" fill={colors.goldSoft} />
      <Path d="M40 60 h28 a8 8 0 0 1 0 16 h-30 a7 7 0 0 1 2 -16 z" fill={colors.surface} opacity={0.95} />
      <Spark x={158} y={58} k={0.8} />
    </Frame>
  );
}

/** Велика золота галочка з променями: «день виконано», винагорода */
export function CelebrationIllustration({ size }: IllustrationProps) {
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  const dots: [number, number, string][] = [
    [44, 50, colors.teal],
    [158, 44, colors.red],
    [30, 108, colors.gold],
    [170, 104, colors.teal],
    [58, 138, colors.red],
    [146, 140, colors.gold],
  ];
  return (
    <Frame size={size}>
      <Circle cx={100} cy={88} r={70} fill={colors.pillGoldBg} />
      {rays.map((a) => (
        <Line key={a} x1={100 + Math.cos((a * Math.PI) / 180) * 54} y1={88 + Math.sin((a * Math.PI) / 180) * 54} x2={100 + Math.cos((a * Math.PI) / 180) * 64} y2={88 + Math.sin((a * Math.PI) / 180) * 64} stroke={colors.goldSoft} strokeWidth={4} strokeLinecap="round" />
      ))}
      <Circle cx={100} cy={88} r={44} fill={colors.gold} />
      <Circle cx={100} cy={88} r={36} fill="none" stroke={colors.goldSoft} strokeWidth={2} strokeDasharray="2 5" />
      <Path d="M80 90 L95 105 L123 73" stroke={colors.surface} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {dots.map(([x, y, c], i) => (
        <Circle key={i} cx={x} cy={y} r={4.5} fill={c} />
      ))}
      <Spark x={72} y={34} k={0.9} />
      <Spark x={132} y={148} k={0.8} fill={colors.goldDark} />
    </Frame>
  );
}

/** Порожня рамка з пейзажем: ще немає фото/записів */
export function EmptyIllustration({ size }: IllustrationProps) {
  return (
    <Frame size={size}>
      <Backdrop />
      <Rect x={52} y={54} width={96} height={78} rx={12} fill={colors.surface} stroke={colors.border} strokeWidth={2.5} strokeDasharray="6 5" />
      <Circle cx={124} cy={80} r={8} fill={colors.goldSoft} />
      <Path d="M58 124 L84 92 L104 114 L118 100 L142 124 Z" fill={colors.tealBorder} />
      <Path d="M58 124 L84 92 L98 108 L74 124 Z" fill={colors.teal} opacity={0.35} />
      <Spark x={150} y={52} k={0.8} />
      <Spark x={46} y={120} k={0.6} fill={colors.goldDark} />
    </Frame>
  );
}

/** Календар із галочкою: план занять */
export function CalendarIllustration({ size }: IllustrationProps) {
  const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  return (
    <Frame size={size}>
      <Backdrop />
      <Rect x={48} y={52} width={104} height={86} rx={14} fill={colors.surface} stroke={colors.border} strokeWidth={2.5} />
      <Path d="M48 66 a14 14 0 0 1 14 -14 h76 a14 14 0 0 1 14 14 v12 h-104 z" fill={colors.deep} />
      <Rect x={70} y={44} width={7} height={16} rx={3.5} fill={colors.goldSoft} />
      <Rect x={123} y={44} width={7} height={16} rx={3.5} fill={colors.goldSoft} />
      {cells.map((i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const on = i === 1 || i === 4 || i === 6 || i === 9;
        return <Circle key={i} cx={66 + col * 23} cy={94 + row * 16} r={5} fill={on ? colors.gold : colors.shade} />;
      })}
      <Circle cx={146} cy={132} r={15} fill={colors.teal} stroke={colors.surface} strokeWidth={3} />
      <Path d="M139 132 L144 137 L153 127" stroke={colors.surface} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Spark x={40} y={60} k={0.8} />
    </Frame>
  );
}

/** Камера з променями: дозвіл на камеру / зйомка */
export function CameraIllustration({ size }: IllustrationProps) {
  return (
    <Frame size={size}>
      <Backdrop tint={colors.tealBg} />
      <Path d="M62 66 h16 l7 -11 h30 l7 11 h16 a10 10 0 0 1 10 10 v46 a10 10 0 0 1 -10 10 h-76 a10 10 0 0 1 -10 -10 v-46 a10 10 0 0 1 10 -10 z" fill={colors.deep} />
      <Circle cx={100} cy={98} r={22} fill={colors.forest} stroke={colors.goldSoft} strokeWidth={4} />
      <Circle cx={100} cy={98} r={10} fill={colors.teal} />
      <Circle cx={92} cy={90} r={3.5} fill={colors.surface} opacity={0.85} />
      <Circle cx={130} cy={76} r={4} fill={colors.gold} />
      <Spark x={44} y={70} k={0.9} />
      <Spark x={160} y={54} k={0.8} fill={colors.goldDark} />
    </Frame>
  );
}
