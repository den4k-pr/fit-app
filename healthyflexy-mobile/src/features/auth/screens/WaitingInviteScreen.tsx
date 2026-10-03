import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { INVITE } from '@/constants/limits';
import { ROUTES } from '@/constants/routes';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useAcceptInvite } from '@/features/family/hooks/useAcceptInvite';
import { EnvelopeIllustration } from '@/shared/illustrations';
import { Reveal } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Screen } from '@/shared/ui/Screen';
import { ScreenHeader } from '@/shared/ui/ScreenHeader';
import { TextField } from '@/shared/ui/TextField';
import { useOnboardingStore } from '@/store/onboarding.store';
import { inviteCodeSchema } from '../auth.schemas';
import { AuthSteps } from '../components/AuthSteps';
import { staysInAuth } from '../lib/app-area';
import { useStepBack } from '../hooks/useStepBack';

/**
 * «Чекаємо на запрошення» (ТЗ §5.5): батько/мати вводить код від дитини (або він підставляється з посилання-запрошення).
 * Успіх → сім'я створена → auth-redirect веде на «Сьогодні».
 */
export function WaitingInviteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const pending = useOnboardingStore((s) => s.pendingInviteCode);
  const [code, setCode] = useState(pending ?? '');
  const join = useAcceptInvite();
  const logout = useLogout();
  // назад — виправити ім'я / вік (а звідти й роль)
  const back = useStepBack(() => router.replace(ROUTES.profileSetup));

  const parsed = inviteCodeSchema.safeParse({ code });
  const error = code.length >= 6 && !parsed.success ? t('errors.INVITE_INVALID') : join.error ? t(`errors.${join.error.code}`) : undefined;

  return (
    <Screen
      bottomInset
      footer={
        <>
          <Button label={t('auth.join.submit')} icon="check" disabled={!parsed.success} loading={join.isPending} onPress={() => parsed.success && join.mutate({ code: parsed.data.code }, { onSuccess: () => staysInAuth() && router.replace(ROUTES.root) })} />
          <Button variant="ghost" size="sm" icon="logout" label={t('profile.logout')} onPress={() => logout.mutate()} />
        </>
      }
    >
      <AuthSteps current={5} />
      <Reveal>
        <View style={styles.art}><EnvelopeIllustration size={170} /></View>
      </Reveal>
      <ScreenHeader title={t('auth.waiting.title')} onBack={back} backLabel={t('common.back')} />
      <Reveal>
        <AppText variant="body" color="soft" style={styles.body}>{t('auth.waiting.body')}</AppText>
      </Reveal>
      <Card>
        <TextField label={t('auth.join.codeLabel')} variant="code" icon="key" value={code} onChangeText={(v) => setCode(normalizeInviteCode(v))} maxLength={6} error={error} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  art: { alignItems: 'center', paddingTop: 4 },
  body: { paddingHorizontal: 16, paddingBottom: 12 },
});

/**
 * Код запрошення — лише латиниця й цифри з алфавіту коду (без 0 O 1 I L). Кирилиця, що виглядає як латиниця
 * (А В Е К М Н О Р С Т Х), перетворюється на латинську; інші символи (кирилиця, пробіли, знаки) просто не вводяться —
 * у полі коду не можна набрати слово на кшталт «ВИЙТИ».
 */
const CYRILLIC_LOOKALIKE: Record<string, string> = { А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', Р: 'P', С: 'C', Т: 'T', Х: 'X' };
export function normalizeInviteCode(value: string): string {
  return [...value.toUpperCase()]
    .map((ch) => CYRILLIC_LOOKALIKE[ch] ?? ch)
    .filter((ch) => INVITE.CODE_ALPHABET.includes(ch))
    .join('')
    .slice(0, INVITE.CODE_LENGTH);
}
