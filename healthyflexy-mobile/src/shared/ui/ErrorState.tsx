import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { errorText } from '@/lib/error-text';
import { AppText } from './AppText';
import { Button } from './Button';
import { IconBadge } from './IconBadge';

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

/** Помилка людською мовою: іконка, пояснення, кнопка «Спробувати ще раз» */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <IconBadge icon="alert" tone="red" size={64} shape="round" />
      <AppText variant="h3" align="center">{t('common.errorTitle')}</AppText>
      <AppText variant="small" color="muted" align="center">{errorText(t, error)}</AppText>
      {onRetry ? <Button label={t('common.retry')} icon="refresh" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12, padding: 24, minHeight: 260, justifyContent: 'center' },
});
