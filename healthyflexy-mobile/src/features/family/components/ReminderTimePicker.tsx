import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import { TextField } from '@/shared/ui/TextField';
import { borderWidth, colors, radius } from '@/theme';
import type { TimeHHmm } from '@/types';

export interface ReminderTimePickerProps {
  value: TimeHHmm;
  onChange: (time: TimeHHmm) => void;
}

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

const toDate = (time: TimeHHmm): Date => {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date;
};

/** Час нагадування батьку/матері (за замовчуванням 10:00). iOS — системний компактний вибір, Android — діалог, web — текстове поле. */
export function ReminderTimePicker({ value, onChange }: ReminderTimePickerProps) {
  const { t } = useTranslation();
  const [webText, setWebText] = useState<string>(value);

  if (Platform.OS === 'web') {
    return (
      <TextField
        label={t('plan.reminderTime')}
        value={webText}
        onChangeText={(text) => {
          setWebText(text);
          if (HH_MM.test(text)) onChange(text);
        }}
        placeholder="HH:mm"
        icon="clock"
        maxLength={5}
      />
    );
  }

  const pick = (_event: unknown, date?: Date) => {
    if (date) onChange(format(date, 'HH:mm'));
  };

  return (
    <View>
      <AppText variant="caption" color="muted" style={styles.label}>{t('plan.reminderTime')}</AppText>
      {Platform.OS === 'android' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('plan.reminderTime')}: ${value}`}
          onPress={() => DateTimePickerAndroid.open({ value: toDate(value), mode: 'time', is24Hour: true, onChange: pick })}
          style={styles.field}
        >
          <AppText variant="body">{value}</AppText>
          <Icon name="clock" size={20} color="muted" />
        </Pressable>
      ) : (
        <View style={[styles.field, styles.iosField]}>
          <DateTimePicker value={toDate(value)} mode="time" display="compact" onChange={pick} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
  field: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: borderWidth.hairline,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iosField: { alignItems: 'flex-start', justifyContent: 'flex-start', paddingVertical: 6 },
});
