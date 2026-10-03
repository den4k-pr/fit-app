import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';

export interface ResendTimerProps {
  secondsLeft: number;
  onResend: () => void;
  loading?: boolean;
}

/** «Повторно через N с» → після завершення кнопка «Надіслати ще раз» */
export function ResendTimer({ secondsLeft, onResend, loading }: ResendTimerProps) {
  const { t } = useTranslation();
  if (secondsLeft > 0) {
    return (
      <View style={styles.row}>
        <Icon name="clock" size={18} color="muted" />
        <AppText variant="small" color="muted">{t('auth.otp.resendIn', { seconds: secondsLeft })}</AppText>
      </View>
    );
  }
  return <Button variant="secondary" icon="refresh" label={t('auth.otp.resend')} onPress={onResend} loading={loading} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48 },
});
