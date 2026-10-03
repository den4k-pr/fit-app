import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { IconBadge } from '@/shared/ui/IconBadge';
import { colors } from '@/theme';

/**
 * Старт без зв'язку з сервером: сесія ціла, просто повторюємо (раніше — викидало на екран входу,
 * і людина вводила код із SMS наново).
 */
export function OfflineStart({ checking, onRetry }: { checking: boolean; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <IconBadge icon="alert" tone="red" size={64} shape="round" />
      <AppText variant="h3" align="center">{t('common.errorTitle')}</AppText>
      <AppText variant="small" color="muted" align="center">{t('errors.NETWORK_ERROR')}</AppText>
      <Button label={t('common.retry')} icon="refresh" loading={checking} onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: colors.paper },
});
