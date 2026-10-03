import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { sendTestNotification } from '@/services/notifications/local-reminders';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { TextField } from '@/shared/ui/TextField';
import { ToggleRow } from '@/shared/ui/ToggleRow';
import { useSettingsStore } from '@/store/settings.store';
import { showToast } from '@/store/ui.store';
import type { TimeHHmm } from '@/types';

export interface ReminderCardProps {
  /** Час із плану (його задає дитина) */
  reminderTime: TimeHHmm;
  childName: string;
}

/** «Нагадування» батька/матері (макет: «Будильник»): локальне сповіщення щодня; час задає дитина в плані (ТЗ §8.7) */
export function ReminderCard({ reminderTime, childName }: ReminderCardProps) {
  const { t } = useTranslation();
  const enabled = useSettingsStore((s) => s.localRemindersEnabled);
  const setEnabled = useSettingsStore((s) => s.setLocalRemindersEnabled);

  const test = async () => {
    const sent = await sendTestNotification(t('reminder.notificationTitle'), t('reminder.notificationBody', { name: childName }));
    showToast(sent ? t('reminder.testSent') : t('reminder.testDenied'));
  };

  return (
    <Card>
      <ToggleRow
        icon="bell"
        label={t('reminder.title')}
        description={t('reminder.everyDay')}
        value={enabled}
        onValueChange={(value) => {
          setEnabled(value);
          showToast(t(value ? 'reminder.on' : 'reminder.off'));
        }}
      />
      <View style={styles.field}>
        <TextField label={t('reminder.time')} value={reminderTime} onChangeText={() => undefined} editable={false} icon="clock" hint={t('reminder.setByChild', { name: childName })} />
      </View>
      <Button variant="secondary" icon="bell-ring" label={t('reminder.test')} onPress={() => void test()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  field: { marginVertical: 12 },
});
