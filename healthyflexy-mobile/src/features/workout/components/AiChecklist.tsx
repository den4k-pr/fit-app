import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { FadeView } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import { colors, radius } from '@/theme';

/** Етапи — саме те, що перевіряє AI на сервері (людина в кадрі, поза, рух, відповідність вправі, оцінка) */
const STEPS = ['person', 'pose', 'movement', 'technique', 'score'] as const;
const STEP_MS = 1100;

/**
 * «AI аналізує» (макет): етапи перевірки з'являються по черзі, поточний — зі спінером.
 * Це лише індикація очікування відповіді сервера: результат вирішує сервер, а не анімація.
 */
export function AiChecklist() {
  const { t } = useTranslation();
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const timer = setInterval(() => setShown((n) => Math.min(STEPS.length, n + 1)), STEP_MS);
    return () => clearInterval(timer);
  }, []);
  return (
    <View style={styles.box}>
      <AppText variant="sectionLabel" color="muted">{t('exercise.aiSteps.title').toUpperCase()}</AppText>
      {STEPS.slice(0, shown).map((step, i) => {
        const active = i === shown - 1;
        return (
          <FadeView key={step} style={styles.row}>
            {active ? <ActivityIndicator size="small" color={colors.green} /> : <Icon name="check" size={16} color="green" strokeWidth={3} />}
            <AppText variant="small" color={active ? 'ink' : 'soft'}>{t(`exercise.aiSteps.${step}`)}</AppText>
          </FadeView>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.shade, borderRadius: radius.md, padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
