import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { say } from '@/services/voice/speech';
import { StyleSheet, View } from 'react-native';
import { useFormat } from '@/shared/hooks/useFormat';
import { CelebrationIllustration } from '@/shared/illustrations';
import { PopIn, Reveal } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import type { AcceptedCompletion, Currency } from '@/types';

export interface DonePhaseProps {
  result: AcceptedCompletion;
  currency: Currency;
  /** «Забрати +€1.25» → екран винагороди */
  onContinue: () => void;
}

/** «Зараховано!» (макет): результат аналізу AI (або кроки) і кнопка «Забрати +сума» за цю вправу */
export function DonePhase({ result, currency, onContinue }: DonePhaseProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const amount = fmt.money(result.earned, currency);
  useEffect(() => {
    say([t('voice.accepted'), result.attempt?.feedback].filter(Boolean).join(' '), { interrupt: true });
  }, [result, t]);
  return (
    <View style={styles.wrap}>
      <PopIn>
        <CelebrationIllustration size={200} />
      </PopIn>
      <Reveal>
        <AppText variant="h1" color="green" align="center">{t('exercise.done.title')}</AppText>
      </Reveal>
      <Reveal>
        <AppText variant="body" color="muted" align="center">
          {result.record.steps !== null ? t('exercise.done.steps', { count: result.record.steps }) : t('exercise.done.subtitle')}
        </AppText>
      </Reveal>
      {result.attempt ? (
        <Card tone="success" style={styles.aiCard}>
          <View style={styles.aiHead}>
            <Icon name="sparkles" size={18} color="forest" />
            <AppText variant="smallStrong" color="forest">{t('exercise.done.aiResult')}</AppText>
          </View>
          <AppText variant="small">{result.attempt.feedback}</AppText>
          {result.attempt.recommendations ? <AppText variant="small" color="soft">{result.attempt.recommendations}</AppText> : null}
          <AppText variant="captionStrong" color="forest">{t('exercise.aiRejected.score', { score: result.attempt.score })}</AppText>
        </Card>
      ) : null}
      <View style={styles.button}>
        <Button label={result.earned > 0 ? t('exercise.done.claim', { amount }) : t('common.continue')} icon="coins" onPress={onContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8, alignItems: 'center', gap: 8 },
  aiCard: { alignSelf: 'stretch', marginHorizontal: 0, marginTop: 12, gap: 6 },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  button: { alignSelf: 'stretch', marginTop: 16 },
});
