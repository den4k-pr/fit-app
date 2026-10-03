import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { ClientErrorCode } from '@/api/errors';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { IconBadge } from '@/shared/ui/IconBadge';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { Card } from '@/shared/ui/Card';
import { LoadingView } from '@/shared/ui/LoadingView';
import { AiChecklist } from './AiChecklist';

export interface UploadPhaseProps {
  progress: number;
  errorCode: ClientErrorCode | null;
  onRetry: () => void;
  /** Вправа на кроки: без фото й AI, лише звірка кроків */
  stepsMode?: boolean;
}

/** Фаза 3: відправка кадрів/кроків і перевірка; при помилці — «Спробувати ще раз» */
export function UploadPhase({ progress, errorCode, onRetry, stepsMode }: UploadPhaseProps) {
  const { t } = useTranslation();
  if (errorCode) {
    return (
      <View style={styles.wrap}>
        <Card tone="error" style={styles.errorCard}>
          <IconBadge icon="alert" tone="red" size={64} shape="round" />
          <AppText variant="h2" align="center">{t(stepsMode ? 'steps.sendFailed' : 'exercise.uploadFailed')}</AppText>
          <AppText variant="small" color="soft" align="center">{t(`errors.${errorCode}`)}</AppText>
        </Card>
        <Button label={t('common.retry')} icon="refresh" onPress={onRetry} />
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <LoadingView message={t(stepsMode ? 'steps.sending' : progress >= 1 ? 'exercise.aiChecking' : 'exercise.uploading')} />
      {stepsMode ? null : progress >= 1 ? <AiChecklist /> : <ProgressBar value={progress} max={1} height={10} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, gap: 14, alignItems: 'stretch' },
  errorCard: { alignItems: 'center', gap: 10, marginHorizontal: 0 },
});
