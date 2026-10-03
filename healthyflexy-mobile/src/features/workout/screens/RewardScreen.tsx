import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ROUTES } from '@/constants/routes';
import { useFormat } from '@/shared/hooks/useFormat';
import { RewardIllustration } from '@/shared/illustrations';
import { PopIn, Reveal } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Screen } from '@/shared/ui/Screen';
import { useExerciseFlowStore } from '@/store/exercise-flow.store';
import { colors, radius } from '@/theme';
import { useToday } from '../hooks/useToday';

/** Плавний підрахунок від 0 до суми (≈ 1 с): сума «набігає», як лічильник */
function useCountUp(target: number, durationMs = 1000): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / durationMs);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p >= 1) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [target, durationMs]);
  return value;
}

/**
 * «Винагорода» після КОЖНОЇ зарахованої вправи (макет): частка ставки «набігає», підсумок до отримання,
 * «Що сталося з тілом» (користь вправи); після останньої вправи — ще й «День виконано» із серією.
 */
export function RewardScreen() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const router = useRouter();
  const result = useExerciseFlowStore((s) => s.lastResult);
  const today = useToday();
  const shown = useCountUp(result?.earned ?? 0);
  if (!result) return <Redirect href={ROUTES.parentToday} />;
  const currency = today.data?.currency ?? 'EUR';
  const exercise = today.data?.exercises.find((e) => e.exerciseId === result.record.exerciseId);
  const goBack = () => {
    useExerciseFlowStore.getState().clearLastResult();
    router.replace(ROUTES.parentToday);
  };
  return (
    // прокрутка: на маленькому екрані з довгою «користю» й серією кнопка не має ховатися за край
    <Screen bottomInset>
      <View style={styles.center}>
        <PopIn>
          <RewardIllustration size={240} />
        </PopIn>
        <AppText variant="h1" color="forest" align="center" style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{`+${fmt.money(Math.round(shown * 100) / 100, currency)}`}</AppText>
        <AppText variant="h3" color="muted" align="center">{t('reward.credited')}</AppText>
        {today.data ? (
          <Reveal delay={500}>
            <Badge tone="success" icon="wallet" label={t('reward.total', { amount: fmt.money(today.data.owed, currency) })} />
          </Reveal>
        ) : null}
        {exercise ? (
          <Reveal delay={650} style={styles.boxOuter}>
            <View style={styles.bodyBox}>
              <AppText variant="smallStrong" color="forest">{t('reward.bodyTitle')}</AppText>
              <AppText variant="small" color="soft">{exercise.benefit}</AppText>
            </View>
          </Reveal>
        ) : null}
        {result.dayCompleted && today.data ? (
          <Reveal delay={800} style={styles.boxOuter}>
            <View style={styles.box}>
              <Icon name="flame" size={28} color="goldDark" />
              <View style={styles.boxTexts}>
                <AppText variant="smallStrong" color="forest">{t('reward.dayDone')}</AppText>
                <AppText variant="small" color="soft">{t('reward.streakLine', { count: today.data.streak })}</AppText>
              </View>
            </View>
          </Reveal>
        ) : null}
        <View style={styles.button}>
          <Button label={t('common.continue')} iconRight="arrow-right" onPress={goBack} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', padding: 24, paddingTop: 32, gap: 10 },
  amount: { fontVariant: ['tabular-nums'], fontSize: 44, lineHeight: 52 },
  boxOuter: { alignSelf: 'stretch' },
  bodyBox: { backgroundColor: colors.shade, borderRadius: radius.lg, padding: 16, marginTop: 14, gap: 6, borderWidth: 1, borderColor: colors.border },
  box: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.pillGoldBg, borderColor: colors.pillGoldBorder, borderWidth: 1, borderRadius: radius.lg, padding: 16, marginTop: 14 },
  boxTexts: { flex: 1, gap: 2 },
  button: { alignSelf: 'stretch', marginTop: 18 },
});
