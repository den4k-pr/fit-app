import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '@/theme';

/** Знак застосунку: біле серце-листок на зеленому квадраті */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect width={40} height={40} rx={12} fill={colors.green} />
      <Path d="M20 31 C 9 24, 8 13, 15.5 11.5 C 18 11, 20 13.6, 20 13.6 C 20 13.6, 22 11, 24.5 11.5 C 32 13, 31 24, 20 31 Z" fill={colors.white} />
      <Path d="M20 30 C 20 24, 21.5 19, 25.5 15.5" stroke={colors.green} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.55} />
    </Svg>
  );
}
