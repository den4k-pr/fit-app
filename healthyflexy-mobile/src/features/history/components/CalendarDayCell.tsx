import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import { borderWidth, colors } from '@/theme';
import { CalendarDayStatus, type CalendarDay, type ISODate } from '@/types';

export interface CalendarDayCellProps {
  day: CalendarDay;
  isToday: boolean;
  selected?: boolean;
  /** Натискаються лише дні з планом (відпочинок — ні) */
  onPress?: (date: ISODate) => void;
}

type Marker = 'check' | 'x' | 'dot' | 'ring' | 'none';

const LOOK: Record<CalendarDayStatus, { bg: string; border: string; text: string; marker: Marker; markerColor: string }> = {
  [CalendarDayStatus.Completed]: { bg: colors.forest, border: colors.forest, text: colors.mint, marker: 'check', markerColor: colors.green },
  [CalendarDayStatus.Missed]: { bg: colors.redBg, border: colors.redBorder, text: colors.red, marker: 'x', markerColor: colors.red },
  [CalendarDayStatus.InProgress]: { bg: colors.surface, border: colors.green, text: colors.ink, marker: 'dot', markerColor: colors.green },
  [CalendarDayStatus.Pending]: { bg: colors.surface, border: colors.green, text: colors.ink, marker: 'ring', markerColor: colors.green },
  [CalendarDayStatus.Planned]: { bg: colors.surface, border: colors.border, text: colors.soft, marker: 'ring', markerColor: colors.muted },
  [CalendarDayStatus.Rest]: { bg: 'transparent', border: 'transparent', text: colors.border, marker: 'none', markerColor: colors.border },
};

/** Клітинка дня: число + маркер. Виконано: темна із золотою галочкою; пропущено: червона з хрестиком; попереду: контур; відпочинок: тихо */
export function CalendarDayCell({ day, isToday, selected, onPress }: CalendarDayCellProps) {
  const dayNumber = Number(day.date.slice(8, 10));
  const look = LOOK[day.status];
  const safeLook = look ?? LOOK[CalendarDayStatus.Planned];
  const pressable = onPress !== undefined && day.status !== CalendarDayStatus.Rest;
  return (
    <Pressable
      style={styles.slot}
      disabled={!pressable}
      accessibilityRole={pressable ? 'button' : undefined}
      accessibilityState={pressable ? { selected: !!selected } : undefined}
      onPress={() => onPress?.(day.date)}
    >
      <View accessible accessibilityLabel={`${dayNumber}`} style={[styles.cell, { backgroundColor: safeLook.bg, borderColor: safeLook.border }, isToday && styles.today, selected && styles.selected]}>
        <AppText variant="bodyMedium" style={{ color: safeLook.text }}>{dayNumber}</AppText>
        <View style={styles.marker}>
          {safeLook.marker === 'check' ? <Icon name="check" size={13} color="green" /> : null}
          {safeLook.marker === 'x' ? <Icon name="x" size={13} color="red" /> : null}
          {safeLook.marker === 'dot' ? <View style={[styles.dot, { backgroundColor: safeLook.markerColor }]} /> : null}
          {safeLook.marker === 'ring' ? <View style={[styles.dot, styles.ring, { borderColor: safeLook.markerColor }]} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { width: `${100 / 7}%`, padding: 2 },
  cell: { borderRadius: 12, borderWidth: borderWidth.thin, alignItems: 'center', paddingVertical: 6, minHeight: 50, gap: 2 },
  today: { borderColor: colors.green, borderWidth: 2 },
  selected: { borderColor: colors.gold, borderWidth: 2 },
  marker: { height: 14, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  ring: { backgroundColor: 'transparent', borderWidth: 1.5 },
});
