import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui/AppText';
import { Card } from '@/shared/ui/Card';
import { Divider } from '@/shared/ui/Divider';
import { IconBadge } from '@/shared/ui/IconBadge';

/** «Безпека»: приватність + медичний дисклеймер (ТЗ §15.1) */
export function DisclaimerCard() {
  const { t } = useTranslation();
  return (
    <Card>
      <View style={styles.row}>
        <IconBadge icon="shield" tone="teal" size={40} shape="squircle" />
        <AppText variant="small" color="soft" style={styles.text}>{t('profile.privacy')}</AppText>
      </View>
      <Divider />
      <View style={styles.row}>
        <IconBadge icon="info" tone="muted" size={40} shape="squircle" />
        <AppText variant="caption" color="muted" style={styles.text}>{t('disclaimer.short')}</AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, lineHeight: 20 },
});
