import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { env } from '@/config/env';
import { errorText } from '@/lib/error-text';
import { PressableScale } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { borderWidth, colors, radius } from '@/theme';
import { useGoogleLogin } from '../hooks/useGoogleLogin';

// повернення з браузера Google у застосунок (web) закриває вікно входу
WebBrowser.maybeCompleteAuthSession();

/** Client ID саме для цієї платформи (без нього провайдер Google не працює) */
export function googleClientIdForPlatform(): string {
  if (Platform.OS === 'android') return env.googleAndroidClientId;
  if (Platform.OS === 'ios') return env.googleIosClientId;
  return env.googleWebClientId;
}

/** Кольоровий логотип «G» (офіційні кольори Google) */
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </Svg>
  );
}

/**
 * «Увійти через Google (Gmail)»: Google повертає ID-токен, сервер перевіряє його й знаходить/створює акаунт
 * за поштою — той самий акаунт, що й при вході кодом на цю пошту. Показується, лише коли задано Client ID.
 */
export function GoogleSignInButton({ onSignedIn }: { onSignedIn: () => void }) {
  const { t } = useTranslation();
  const login = useGoogleLogin();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: env.googleWebClientId || undefined,
    androidClientId: env.googleAndroidClientId || undefined,
    iosClientId: env.googleIosClientId || undefined,
    selectAccount: true,
  });

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params.id_token ?? response.authentication?.idToken;
    if (idToken) login.mutate(idToken, { onSuccess: onSignedIn });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const busy = login.isPending;
  return (
    <View style={styles.wrap}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('auth.google.button')}
        disabled={!request || busy}
        onPress={() => void promptAsync()}
        haptic
        style={[styles.button, (!request || busy) && styles.disabled]}
      >
        <GoogleLogo />
        <AppText variant="bodyStrong" color="ink">{busy ? t('auth.google.signingIn') : t('auth.google.button')}</AppText>
      </PressableScale>
      {login.error ? <AppText variant="caption" color="red" align="center">{errorText(t, login.error)}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 56,
    borderRadius: radius.pill,
    borderWidth: borderWidth.medium,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
  },
  disabled: { opacity: 0.6 },
});
