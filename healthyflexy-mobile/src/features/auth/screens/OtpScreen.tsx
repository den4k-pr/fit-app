import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { OTP } from '@/constants/limits';
import { ROUTES } from '@/constants/routes';
import { errorText } from '@/lib/error-text';
import { formatForDisplay } from '@/lib/phone';
import { Reveal } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { IconBadge } from '@/shared/ui/IconBadge';
import { Screen } from '@/shared/ui/Screen';
import { ScreenHeader } from '@/shared/ui/ScreenHeader';
import { AuthSteps } from '../components/AuthSteps';
import { HelpLink } from '../components/HelpLink';
import { OtpInput } from '../components/OtpInput';
import { ResendTimer } from '../components/ResendTimer';
import { useOtpCountdown } from '../hooks/useOtpCountdown';
import { useRequestEmailOtp } from '../hooks/useRequestEmailOtp';
import { useRequestOtp } from '../hooks/useRequestOtp';
import { useVerifyEmailOtp } from '../hooks/useVerifyEmailOtp';
import { useVerifyOtp } from '../hooks/useVerifyOtp';
import { staysInAuth } from '../lib/app-area';

/**
 * «Введіть код» (ТЗ §5.4): код із SMS (`phone`) або з листа (`email`). Автозавершення на 6-й цифрі,
 * повторна відправка після паузи. Параметр `email` є → канал «пошта», інакше «телефон».
 */
export function OtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { phone = '', email = '', retry } = useLocalSearchParams<{ phone?: string; email?: string; retry?: string }>();
  const isEmail = email !== '';
  const [code, setCode] = useState('');
  const verifyPhone = useVerifyOtp();
  const verifyEmail = useVerifyEmailOtp();
  const resendPhone = useRequestOtp();
  const resendEmail = useRequestEmailOtp();
  const verify = isEmail ? verifyEmail : verifyPhone;
  const resend = isEmail ? resendEmail : resendPhone;
  const countdown = useOtpCountdown(Number(retry ?? OTP.RESEND_COOLDOWN_SECONDS));

  // стан змінився → `/` сам веде далі: роль / профіль / «Сьогодні»
  const done = { onSuccess: () => staysInAuth() && router.replace(ROUTES.root), onError: () => setCode('') };
  const submit = (value: string) =>
    isEmail ? verifyEmail.mutate({ email, code: value }, done) : verifyPhone.mutate({ phone, code: value }, done);
  const restart = { onSuccess: (res: { retryAfterSeconds: number }) => countdown.restart(res.retryAfterSeconds) };
  const resendCode = () => (isEmail ? resendEmail.mutate({ email }, restart) : resendPhone.mutate({ phone }, restart));

  const error = verify.error ? errorText(t, verify.error) : resend.error ? errorText(t, resend.error) : undefined;
  const target = isEmail ? email : formatForDisplay(phone);

  return (
    <Screen
      bottomInset
      footer={<Button label={t('auth.otp.verify')} icon="check" loading={verify.isPending} disabled={code.length < OTP.LENGTH} onPress={() => submit(code)} />}
    >
      <AuthSteps current={2} />
      <ScreenHeader title={t(isEmail ? 'auth.otp.titleEmail' : 'auth.otp.title')} onBack={() => router.back()} backLabel={t('common.back')} />
      <Reveal>
        <View style={styles.sent}>
          <IconBadge icon={isEmail ? 'mail' : 'phone'} tone="teal" size={48} shape="round" />
          <View style={styles.sentTexts}>
            <AppText variant="small" color="muted">{t('auth.otp.sentLabel')}</AppText>
            <AppText variant="h3" color="forest" numberOfLines={1}>{target}</AppText>
          </View>
        </View>
      </Reveal>
      <Card>
        <OtpInput value={code} onChange={setCode} onComplete={submit} error={error} autoFocus />
        <AppText variant="small" color="muted" style={styles.helpText}>{t(isEmail ? 'auth.otp.spamHint' : 'auth.otp.help')}</AppText>
        <View style={styles.resend}>
          <ResendTimer secondsLeft={countdown.secondsLeft} loading={resend.isPending} onResend={resendCode} />
        </View>
      </Card>
      <View style={styles.links}>
        <Button variant="ghost" size="sm" icon="arrow-left" label={t(isEmail ? 'auth.otp.changeEmail' : 'auth.otp.changeNumber')} onPress={() => router.back()} />
        <HelpLink />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sent: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 14 },
  sentTexts: { flex: 1 },
  resend: { marginTop: 16 },
  helpText: { marginTop: 18 },
  links: { alignItems: 'center', gap: 4 },
});
