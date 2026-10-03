import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { toIsoDate } from '@/lib/iso-date';
import { FadeView } from '@/shared/motion';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Icon } from '@/shared/ui/Icon';
import { CameraIllustration } from '@/shared/illustrations';
import { colors } from '@/theme';
import { SessionStatus } from '@/types';
import type { DayWithSession } from '../hooks/useWeekPhotos';
import { PhotoRow } from './PhotoRow';

/** «Фото за тиждень» (ТЗ §7.1): дні з відмітками, під кожним — вправи. Старші за 7 днів → «Фото видалено». */
export function WeekPhotosList({ days }: { days: DayWithSession[] }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const today = toIsoDate(new Date());
  const withRecords = days.filter((d) => d.records.length > 0);

  if (withRecords.length === 0) {
    return (
      <Card>
        <EmptyState illustration={<CameraIllustration size={130} />} title={t('dashboard.photosEmpty.title')} description={t('dashboard.photosEmpty.body')} />
      </Card>
    );
  }

  return (
    <Card flush>
      {withRecords.map((day, dayIndex) => (
        <FadeView key={day.session.id} delay={dayIndex * 70}>
          <View style={styles.dayHeader}>
            <View style={styles.dayTitle}>
              <Icon name="calendar-check" size={15} color="soft" />
              <AppText variant="captionStrong" color="soft">
                {day.session.date === today ? t('common.today') : fmt.shortDate(day.session.date)}
              </AppText>
            </View>
            {day.session.status === SessionStatus.Completed ? (
              <Icon name="check-circle" size={18} color="teal" />
            ) : (
              <AppText variant="caption" color="muted">{`${day.session.exercisesDone}/${day.session.exercisesTotal}`}</AppText>
            )}
          </View>
          {day.records.map((record, index) => (
            <PhotoRow key={record.id} record={record} isLast={index === day.records.length - 1} />
          ))}
        </FadeView>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9, backgroundColor: colors.shade },
  dayTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
