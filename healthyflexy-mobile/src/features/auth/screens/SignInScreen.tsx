import { getLocales } from 'expo-localization';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { DEFAULT_COUNTRY, SMS_COUNTRIES, type SmsCountryCode } from '@/constants/countries';
import { ROUTES } from '@/constants/routes';
import { errorText } from '@/lib/error-text';
import { formatForDisplay } from '@/lib/phone';
import { FadeView } from '@/shared/motion';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Screen } from '@/shared/ui/Screen';
import { ScreenHeader } from '@/shared/ui/ScreenHeader';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { TextField } from '@/shared/ui/TextField';
import { AppText } from '@/shared/ui/AppText';
import { colors, radius } from '@/theme';
import { AuthSteps } from '../components/AuthSteps';
import { CountryPicker } from '../components/CountryPicker';
import { GoogleSignInButton, googleClientIdForPlatform } from '../components/GoogleSignInButton';
import { HelpLink } from '../components/HelpLink';
import { PhoneInput, toE164 } from '../components/PhoneInput';
import { useAuthConfig } from '../hooks/useAuthConfig';
import { useStepBack } from '../hooks/useStepBack';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useRequestEmailOtp } from '../hooks/useRequestEmailOtp';
import { useRequestOtp } from '../hooks/useRequestOtp';
import { staysInAuth } from '../lib/app-area';

type Method = 'phone' | 'email';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Країна за замовчуванням: Польща (ТЗ §5.4); якщо регіон пристрою — Україна, підставляємо її */
const initialCountry = (): SmsCountryCode => {
  const region = getLocales()[0]?.regionCode;
  return SMS_COUNTRIES.find((c) => c.code === region)?.code ?? DEFAULT_COUNTRY;
};

/**
 * Крок 1 (ТЗ §5.4): вхід за номером телефону АБО за поштою — завжди з кодом підтвердження (SMS / лист).
 * Вибір «Телефон / Пошта» є завжди. Якщо SMS-сервіс на сервері ще не підключено (GET /auth/config → phoneEnabled: false),
 * на вкладці «Телефон» — зрозуміле пояснення й кнопка переходу до пошти, а не помилка після відправки. Обидва способи на ОДНОМУ екрані: перемикач із повзунком
 * не переходить на інший маршрут, тож нічого не перезавантажується і не мигає, змінюється лише поле під ним.
 * Перед відправкою коду: велике підтвердження «Цей номер / ця адреса правильні?».
 */
export function SignInScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { emailEnabled, phoneEnabled, googleEnabled } = useAuthConfig();
  const [method, setMethod] = useState<Method>('phone');
  // вибраний спосіб, для якого сервер зараз не може надіслати код
  const unavailable = method === 'phone' ? !phoneEnabled : !emailEnabled;
  const [country, setCountry] = useState<SmsCountryCode>(initialCountry);
  const [digits, setDigits] = useState('');
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const requestPhone = useRequestOtp();
  const requestEmail = useRequestEmailOtp();
  const showGoogle = googleEnabled && googleClientIdForPlatform().length > 0;

  // назад — до слайдів про застосунок
  const back = useStepBack(() => {
    useOnboardingStore.getState().resetOnboardingSeen();
    router.replace(ROUTES.onboarding);
  });
  const isPhone = method === 'phone';
  const normalizedEmail = email.trim().toLowerCase();
  const canSubmit = !unavailable && (isPhone ? digits.length >= 5 : normalizedEmail.length >= 5);

  const askConfirm = () => {
    const target = isPhone ? toE164(country, digits) : EMAIL_PATTERN.test(normalizedEmail) ? normalizedEmail : null;
    if (!target) return setInvalid(true);
    setInvalid(false);
    setConfirming(target);
  };

  const send = () => {
    const target = confirming;
    setConfirming(null);
    if (!target) return;
    if (isPhone) {
      return requestPhone.mutate({ phone: target }, { onSuccess: (res) => router.push({ pathname: ROUTES.otp, params: { phone: target, retry: String(res.retryAfterSeconds) } }) });
    }
    requestEmail.mutate({ email: target }, { onSuccess: (res) => router.push({ pathname: ROUTES.otp, params: { email: target, retry: String(res.retryAfterSeconds) } }) });
  };

  const failure = isPhone ? requestPhone.error : requestEmail.error;
  const error = invalid ? t(isPhone ? 'auth.phone.invalid' : 'auth.email.invalid') : failure ? errorText(t, failure) : undefined;
  const pending = requestPhone.isPending || requestEmail.isPending;
  const buttonLabel = isPhone ? t('auth.phone.send') : t('auth.email.send');

  return (
    <Screen bottomInset footer={<Button label={buttonLabel} icon="send" loading={pending} disabled={!canSubmit} onPress={askConfirm} />}>
      <AuthSteps current={1} />
      <ScreenHeader title={t(isPhone ? 'auth.phone.title' : 'auth.email.title')} onBack={back} backLabel={t('common.back')} />
      <View style={styles.switch}>
        <SegmentedControl<Method>
          value={method}
          onChange={(next) => {
            setMethod(next);
            setInvalid(false);
          }}
          options={[
            { key: 'phone', label: t('auth.method.phone'), icon: 'phone' },
            { key: 'email', label: t('auth.method.email'), icon: 'mail' },
          ]}
        />
      </View>
      {unavailable ? (
        <View style={styles.notice}>
          <AppText variant="small" style={styles.noticeText}>{t(isPhone ? 'auth.phone.unavailable' : 'auth.email.unavailable')}</AppText>
          <Button
            variant="ghost"
            size="sm"
            icon={isPhone ? 'mail' : 'phone'}
            label={t(isPhone ? 'auth.method.useEmail' : 'auth.method.usePhone')}
            onPress={() => { setMethod(isPhone ? 'email' : 'phone'); setInvalid(false); }}
          />
        </View>
      ) : null}

      <Card still>
        <FadeView key={method}>
          {isPhone ? (
            <>
              <CountryPicker value={country} onChange={(c) => { setCountry(c); setDigits(''); setInvalid(false); }} />
              <View style={styles.gap} />
              <PhoneInput country={country} digits={digits} onChange={(d) => { setDigits(d); setInvalid(false); }} error={error} autoFocus />
            </>
          ) : (
            <TextField
              label={t('auth.email.label')}
              icon="mail"
              value={email}
              onChangeText={(v) => { setEmail(v); setInvalid(false); }}
              keyboardType="email-address"
              placeholder="name@gmail.com"
              hint={t('auth.email.hint')}
              error={error}
              autoFocus
              maxLength={254}
              inputProps={{ autoCapitalize: 'none', autoCorrect: false, autoComplete: 'email', textContentType: 'emailAddress', returnKeyType: 'done' }}
            />
          )}
        </FadeView>
      </Card>
      {showGoogle ? (
        <View style={styles.google}>
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <AppText variant="caption" color="muted">{t('auth.google.or')}</AppText>
            <View style={styles.orLine} />
          </View>
          <GoogleSignInButton onSignedIn={() => staysInAuth() && router.replace(ROUTES.root)} />
        </View>
      ) : null}
      <View style={styles.help}><HelpLink /></View>

      <ConfirmDialog
        visible={confirming !== null}
        highlight
        title={t(isPhone ? 'auth.phone.confirmTitle' : 'auth.email.confirmTitle')}
        message={confirming ? (isPhone ? formatForDisplay(confirming) : confirming) : ''}
        confirmLabel={t('auth.phone.confirmYes')}
        cancelLabel={t('auth.phone.confirmFix')}
        onConfirm={send}
        onCancel={() => setConfirming(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  switch: { paddingHorizontal: 16, marginBottom: 12 },
  gap: { height: 16 },
  help: { alignItems: 'center' },
  google: { paddingHorizontal: 16, gap: 12, marginBottom: 12 },
  notice: { marginHorizontal: 16, marginBottom: 12, padding: 12, gap: 6, borderRadius: radius.md, backgroundColor: colors.pillGoldBg, borderWidth: 1, borderColor: colors.pillGoldBorder },
  noticeText: { color: colors.pillGoldText },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
});
