import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { say } from '@/services/voice/speech';
import { StyleSheet, View } from 'react-native';
import { FadeView } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { IconBadge } from '@/shared/ui/IconBadge';
import { colors, radius } from '@/theme';
import type { AttemptIssue, AttemptResult } from '@/types';

export interface AiRejectedPhaseProps {
  attempt: AttemptResult;
  onRetry: () => void;
  /** Пропустити вправу без оплати й перейти до інших (порядок вправ не важливий) */
  onSkip?: () => void;
  skipping?: boolean;
}

/**
 * Вправу не зараховано: що саме й на якій секунді було не так (вправа ділиться на 12 моментів,
 * сусідні моменти з однією причиною склеєні у відрізок), загальний відгук і порада. Потім — «Спробувати ще раз»
 * або «Пропустити без оплати»: повторювати не обов'язково, інші вправи дня лишаються доступними.
 */
export function AiRejectedPhase({ attempt, onRetry, onSkip, skipping }: AiRejectedPhaseProps) {
  const { t } = useTranslation();
  const issues = attempt.issues ?? [];
  // голосом — що не так і як виправити (людина може стояти далеко від екрана)
  useEffect(() => {
    say([attempt.feedback, attempt.recommendations].filter(Boolean).join(' '), { interrupt: true });
  }, [attempt]);
  const when = (issue: AttemptIssue) =>
    issue.fromSec === issue.toSec
      ? t('exercise.aiRejected.atSecond', { sec: issue.fromSec })
      : t('exercise.aiRejected.fromTo', { from: issue.fromSec, to: issue.toSec });

  return (
    <View style={styles.wrap}>
      <Card tone="warning" style={styles.card}>
        <IconBadge icon="refresh" tone="gold" size={64} shape="round" />
        <AppText variant="h2" align="center">{t('exercise.aiRejected.title')}</AppText>
        <AppText variant="small" color="soft" align="center">{attempt.feedback}</AppText>
      </Card>

      {issues.length > 0 ? (
        <Card>
          <AppText variant="sectionLabel" color="muted" style={styles.label}>{t('exercise.aiRejected.timeline').toUpperCase()}</AppText>
          {issues.map((issue, i) => (
            <FadeView key={`${issue.fromSec}-${i}`} delay={i * 90} style={[styles.row, i < issues.length - 1 && styles.divider]}>
              <View style={styles.time}>
                <AppText variant="captionStrong" color="red" align="center">{when(issue)}</AppText>
              </View>
              <AppText variant="small" style={styles.reason}>{issue.reason}</AppText>
            </FadeView>
          ))}
        </Card>
      ) : null}

      {attempt.recommendations ? (
        <View style={styles.tip}>
          <AppText variant="captionStrong" color="forest">{t('exercise.aiRejected.howToFix')}</AppText>
          <AppText variant="small">{attempt.recommendations}</AppText>
        </View>
      ) : null}
      <AppText variant="caption" color="muted" align="center">{t('exercise.aiRejected.score', { score: attempt.score })}</AppText>
      <Button label={t('exercise.aiRejected.retry')} icon="refresh" onPress={onRetry} />
      {onSkip ? (
        <>
          <Button variant="ghost" label={t('exercise.skip.button')} icon="skip" loading={skipping} onPress={onSkip} />
          <AppText variant="caption" color="muted" align="center">{t('exercise.skip.hint')}</AppText>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, gap: 12, alignItems: 'stretch' },
  card: { alignItems: 'center', gap: 10, marginHorizontal: 0 },
  label: { marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  time: { minWidth: 86, backgroundColor: colors.redBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  reason: { flex: 1 },
  tip: { backgroundColor: colors.greenLight, borderColor: colors.greenBorder, borderWidth: 1, borderRadius: radius.md, padding: 12, gap: 4 },
});
