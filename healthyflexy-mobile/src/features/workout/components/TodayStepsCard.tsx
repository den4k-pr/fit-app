import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { STEPS } from '@/constants/limits';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { IconBadge } from '@/shared/ui/IconBadge';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { SectionLabel } from '@/shared/ui/SectionLabel';
import { useStepsSync } from '@/features/activity/hooks/useStepsSync';
import { useStepCounter } from '../hooks/useStepCounter';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Картка «Кроки сьогодні» (шагомір із макета): iOS — усі кроки з півночі (історія CoreMotion),
 * Android — кроки, поки застосунок відкритий. Дозвіл просимо лише на натискання «Увімкнути крокомір».
 */
export function TodayStepsCard() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const [since] = useState(startOfToday);
  const counter = useStepCounter(since);
  // графік «Кроки і тренування» у дитини: кроки за дні йдуть на сервер
  useStepsSync(counter.status === 'ready' ? counter.steps : null);

  if (counter.status === 'checking' || counter.status === 'unavailable') return null;

  const ready = counter.status === 'ready';
  // заголовок розділу — разом із карткою: без крокоміра не лишається порожній «Шагомер»
  return (
    <>
    <SectionLabel>{t('steps.today.section')}</SectionLabel>
    <Card>
      <View style={styles.row}>
        <View style={styles.texts}>
          <AppText variant="bigNumber" color="forest">{ready ? fmt.number(counter.steps) : '—'}</AppText>
          <AppText variant="caption" color="muted">
            {t(counter.countsInBackground ? 'steps.today.ofGoal' : 'steps.today.ofGoalSession', { count: ready ? counter.steps : 0, goal: fmt.number(STEPS.DAILY_GOAL) })}
          </AppText>
        </View>
        <IconBadge icon="footprints" tone="teal" size={52} shape="round" />
      </View>
      <ProgressBar value={ready ? counter.steps : 0} max={STEPS.DAILY_GOAL} />
      {counter.status === 'needs-permission' ? (
        <View style={styles.action}>
          <Button variant="secondary" size="sm" icon="footprints" label={t('steps.today.enable')} onPress={() => void counter.requestPermission()} />
        </View>
      ) : null}
      {counter.status === 'denied' ? (
        <AppText variant="caption" color="muted" style={styles.action}>{t('steps.today.denied')}</AppText>
      ) : null}
    </Card>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  texts: { gap: 2 },
  action: { marginTop: 12 },
});
