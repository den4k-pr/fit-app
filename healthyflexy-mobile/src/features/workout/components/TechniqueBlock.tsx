import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui/AppText';
import { IconBadge } from '@/shared/ui/IconBadge';
import { borderWidth, colors, radius } from '@/theme';

export interface TechniqueBlockProps {
  description: string;
}

/** Опис техніки → окремі кроки за реченнями («1. Ноги на ширині плечей…») */
export function techniqueSteps(description: string): string[] {
  return description
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** «Як виконувати»: техніка вправи покроково (під демонстрацією; її ж озвучує голосовий помічник) */
export function TechniqueBlock({ description }: TechniqueBlockProps) {
  const { t } = useTranslation();
  const steps = techniqueSteps(description);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <IconBadge icon="clipboard" tone="forest" size={36} />
        <AppText variant="captionStrong" style={styles.title}>{t('exercise.technique')}</AppText>
      </View>
      {steps.map((step, i) => (
        <View key={i} style={styles.step}>
          <View style={styles.num}>
            <AppText variant="captionStrong" style={styles.numText}>{i + 1}</AppText>
          </View>
          <AppText variant="small" style={styles.stepText}>{step}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: borderWidth.thin, borderRadius: radius.lg, padding: 14, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: colors.forest },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  num: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  numText: { color: colors.forest },
  stepText: { flex: 1 },
});
