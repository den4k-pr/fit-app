import type { ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { colors, typography, type ColorToken, type TextVariant } from '@/theme';

export interface AppTextProps {
  children: ReactNode;
  variant?: TextVariant;
  color?: ColorToken;
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  /** Межа збільшення системним шрифтом (тісні місця: вкладки, плашки); типово — за варіантом */
  maxFontSizeMultiplier?: number;
  /** Зменшити шрифт, щоб текст уміщався в numberOfLines (довгі слова в тісних місцях: кнопки, кільце, плитки) */
  adjustsFontSizeToFit?: boolean;
  /** Найменший масштаб шрифту для adjustsFontSizeToFit (0–1) */
  minimumFontScale?: number;
  /** Приховати від скрін-рідерів (декоративні емодзі) */
  decorative?: boolean;
  style?: StyleProp<TextStyle>;
}

/**
 * Великий системний шрифт поважається (ТЗ §17), але заголовки й великі числа ростуть обмежено —
 * інакше вони ламають верстку (переноси по літері, вихід за картку).
 */
const MAX_SCALE: Partial<Record<TextVariant, number>> = {
  h1: 1.3,
  h2: 1.35,
  timer: 1.15,
  bigNumber: 1.25,
  statNumber: 1.3,
  sectionLabel: 1.4,
  micro: 1.5,
};

/** Єдиний текстовий компонент: шрифт (Montserrat), розмір і колір беруться з токенів. */
export function AppText({
  children,
  variant = 'body',
  color = 'ink',
  align,
  numberOfLines,
  maxFontSizeMultiplier,
  adjustsFontSizeToFit,
  minimumFontScale,
  decorative,
  style,
}: AppTextProps) {
  return (
    <Text
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_SCALE[variant] ?? 1.6}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      style={[styles.base, typography[variant], { color: colors[color], textAlign: align }, style]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  // Android додає зайвий верхній відступ шрифту — через це Montserrat «з'їжджав» у кнопках і пігулках
  base: { includeFontPadding: false },
});
