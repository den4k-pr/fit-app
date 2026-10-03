import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { isoWeekdayOf } from '@/lib/iso-date';
import { FadeView } from '@/shared/motion';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { Card } from '@/shared/ui/Card';
import { IconButton } from '@/shared/ui/IconButton';
import { LoadingView } from '@/shared/ui/LoadingView';
import type { Calendar, ISODate, YearMonth } from '@/types';
import { CalendarDayCell } from './CalendarDayCell';
import { CalendarLegend } from './CalendarLegend';

export interface MonthCalendarProps {
  month: YearMonth;
  calendar: Calendar | undefined;
  isLoading: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Тап по дню (програма тренувань → деталі дня). Без нього клітинки не натискаються */
  onSelectDay?: (date: ISODate) => void;
  selectedDate?: ISODate | null;
  /** Без власної картки (коли календар уже всередині іншої картки) */
  bare?: boolean;
}

/** Календар місяця (ТЗ §6.4): стрілки, тиждень з понеділка, при зміні місяця сітка плавно з'являється знову */
export function MonthCalendar({ month, calendar, isLoading, canGoNext, onPrev, onNext, onSelectDay, selectedDate, bare }: MonthCalendarProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const weekdays = fmt.weekdayNames('short');
  const days = calendar?.days ?? [];
  const leading = days.length > 0 ? isoWeekdayOf(days[0].date) - 1 : 0;

  const body = (
    <>
      <View style={styles.header}>
        <IconButton onPress={onPrev} accessibilityLabel={t('history.prevMonth')} icon="chevron-left" />
        <AppText variant="h3">{capitalize(fmt.monthTitle(month))}</AppText>
        <View style={canGoNext ? undefined : styles.hidden}>
          <IconButton onPress={onNext} accessibilityLabel={t('history.nextMonth')} icon="chevron-right" />
        </View>
      </View>

      <View style={styles.week}>
        {weekdays.map((name) => (
          <View key={name} style={styles.weekSlot}>
            <AppText variant="micro" color="muted" align="center">{name}</AppText>
          </View>
        ))}
      </View>

      {isLoading ? (
        <LoadingView />
      ) : (
        <FadeView key={month}>
          <View style={styles.grid}>
            {Array.from({ length: leading }, (_, i) => <View key={`blank-${i}`} style={styles.weekSlot} />)}
            {days.map((day) => (
              <CalendarDayCell
                key={day.date}
                day={day}
                isToday={day.date === calendar?.todayDate}
                selected={day.date === selectedDate}
                onPress={onSelectDay}
              />
            ))}
          </View>
        </FadeView>
      )}
      <CalendarLegend />
    </>
  );
  return bare ? body : <Card>{body}</Card>;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  hidden: { opacity: 0, pointerEvents: 'none' },
  week: { flexDirection: 'row', marginBottom: 4 },
  weekSlot: { width: `${100 / 7}%`, padding: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
