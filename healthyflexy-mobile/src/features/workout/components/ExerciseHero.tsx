import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, shadows } from '@/theme';

/** Темна «сцена» вправи: демо-відео, іконка категорії або камера. Кола на тлі дають глибину. */
export function ExerciseHero({ children, padded = true }: { children: ReactNode; padded?: boolean }) {
  return (
    <View style={[styles.hero, shadows.card]}>
      <View style={[styles.blob, styles.blobA]} />
      <View style={[styles.blob, styles.blobB]} />
      <View style={padded ? styles.padded : styles.full}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.forest, borderRadius: radius.lg, overflow: 'hidden', marginBottom: 12, alignItems: 'center' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: colors.deep },
  blobA: { width: 240, height: 240, top: -110, left: -80, opacity: 0.55 },
  blobB: { width: 180, height: 180, bottom: -90, right: -50, opacity: 0.7 },
  padded: { padding: 32, gap: 12, alignItems: 'center' },
  full: { width: '100%', alignItems: 'center' },
});
