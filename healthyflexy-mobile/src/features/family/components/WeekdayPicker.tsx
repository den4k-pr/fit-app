import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { toIsoDate, isoWeekdayOf } from '@/lib/iso-date';
import { PressableScale } from '@/shared/motion';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import { borderWidth, colors } from '@/theme';

export interface WeekdayPickerProps {
  /** ISO-дні тижня 1–7 (Пн = 1) */
  selected: number[];
  onToggle: (day: number) => void;
}

function Day({ label, longLabel, hint, active, today, onPress }: { label: string; longLabel: string; hint: string; active: boolean; today: boolean; onPress: () => void }) {
  const box = useAnimatedStyle(() => ({
    backgroundColor: withTiming(active ? colors.forest : colors.surface, { duration: 180 }),
    borderColor: withTiming(today ? colors.green : active ? colors.forest : colors.border, { duration: 180 }),
  }));
  return (
    <PressableScale accessibilityRole="checkbox" accessibilityLabel={longLabel} accessibilityHint={hint} accessibilityState={{ checked: active }} onPress={onPress} haptic scaleTo={0.93}>
      <Animated.View style={[styles.cell, box]}>
        <AppText variant="micro" style={{ color: active ? colors.green : colors.muted }}>{label}</AppText>
        <Icon name={active ? 'check' : 'minus'} size={16} color={active ? 'green' : 'muted'} />
      </Animated.View>
    </PressableScale>
  );
}

/** 7 кнопок Пн–Нд: обрані плавно темніють і отримують галочку; сьогодні — золота рамка */
export function WeekdayPicker({ selected, onToggle }: WeekdayPickerProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const short = fmt.weekdayNames('short');
  const long = fmt.weekdayNames('long');
  const todayWeekday = isoWeekdayOf(toIsoDate(new Date()));

  return (
    <View style={styles.grid}>
      {short.map((label, index) => {
        const day = index + 1;
        return (
          <View key={day} style={styles.slot}>
            <Day label={label} longLabel={long[index]} hint={t('plan.dayHint')} active={selected.includes(day)} today={day === todayWeekday} onPress={() => onToggle(day)} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', marginHorizontal: -2 },
  slot: { width: `${100 / 7}%`, padding: 2 },
  cell: { minHeight: 60, borderRadius: 12, borderWidth: borderWidth.thin + 0.5, alignItems: 'center', justifyContent: 'center', gap: 4 },
});
