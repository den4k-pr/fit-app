import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import { LEGAL_URLS } from '@/constants/legal';
import { PressableScale } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';

/** «Потрібна допомога?» → лист у підтримку. Для тих, хто не має доступу до номера або не отримує код. */
export function HelpLink() {
  const { t } = useTranslation();
  return (
    <PressableScale accessibilityRole="link" onPress={() => void Linking.openURL(LEGAL_URLS.support)} style={styles.link} scaleTo={0.96}>
      <View style={styles.row}>
        <Icon name="help" size={20} color="teal" />
        <AppText variant="bodyMedium" color="teal">{t('auth.help.link')}</AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
