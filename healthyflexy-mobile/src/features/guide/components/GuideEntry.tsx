import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui/AppText';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { IconBadge } from '@/shared/ui/IconBadge';
import type { GuideRole } from '../guide.slides';
import { useGuideStore } from '../guide.store';

/** «Як користуватися застосунком» у профілі: відкриває гайд для своєї ролі */
export function GuideEntry({ role }: { role: GuideRole }) {
  const { t } = useTranslation();
  return (
    <Card onPress={() => useGuideStore.getState().open(role)}>
      <View style={styles.row}>
        <IconBadge icon="help" tone="teal" size={44} shape="round" />
        <View style={styles.texts}>
          <AppText variant="bodyStrong">{t('guide.open')}</AppText>
          <AppText variant="caption" color="muted">{t('guide.openHint')}</AppText>
        </View>
        <Icon name="chevron-right" size={20} color="soft" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  texts: { flex: 1, gap: 2 },
});
