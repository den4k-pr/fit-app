import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { PhotoGallery } from '@/shared/components/PhotoGallery';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { Card } from '@/shared/ui/Card';
import { ErrorState } from '@/shared/ui/ErrorState';
import { IconBadge } from '@/shared/ui/IconBadge';
import { LoadingView } from '@/shared/ui/LoadingView';
import { Screen } from '@/shared/ui/Screen';
import { ScreenHeader } from '@/shared/ui/ScreenHeader';
import { toIsoDate } from '@/lib/iso-date';
import { usePhotoUrls } from '../hooks/usePhotoUrls';
import { useWeekPhotos } from '../hooks/useWeekPhotos';

/** Кадри вправи (лише дитина; ТЗ §7.4). Підписані URL діють 1 годину; після 7 днів — «Фото видалено». */
export function PhotosScreen() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const router = useRouter();
  const { recordId } = useLocalSearchParams<{ recordId: string }>();
  const photos = usePhotoUrls(recordId ?? null);
  const week = useWeekPhotos();

  const record = week.data?.flatMap((d) => d.records).find((r) => r.id === recordId);
  const subtitle = record ? fmt.when(record.completedAt, toIsoDate(new Date())) : undefined;

  return (
    <Screen bottomInset>
      <ScreenHeader title={record?.exerciseName ?? t('photos.title')} subtitle={subtitle} onBack={() => router.back()} backLabel={t('common.back')} />
      {photos.isLoading ? <LoadingView /> : null}
      {photos.isError ? <ErrorState error={photos.error} onRetry={() => void photos.refetch()} /> : null}
      {photos.data ? <PhotoGallery photos={photos.data.photos} /> : null}
      {photos.data?.attempt ? (
        <Card>
          <View style={styles.attemptHead}>
            <IconBadge icon="sparkles" tone="teal" size={38} />
            <AppText variant="bodyStrong">{t('exercise.aiRejected.score', { score: photos.data.attempt.score })}</AppText>
          </View>
          <AppText variant="small" color="soft" style={styles.attemptText}>{photos.data.attempt.feedback}</AppText>
          <AppText variant="small" color="soft" style={styles.attemptText}>{photos.data.attempt.recommendations}</AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  attemptHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  attemptText: { marginTop: 8 },
});
