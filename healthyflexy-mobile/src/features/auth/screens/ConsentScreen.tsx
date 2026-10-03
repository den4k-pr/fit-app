import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ROUTES } from '@/constants/routes';
import { ConsentCheckboxes, type ConsentState } from '@/features/onboarding/components/ConsentCheckboxes';
import { ShieldIllustration } from '@/shared/illustrations';
import { Reveal } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { Screen } from '@/shared/ui/Screen';
import { useOnboardingStore } from '@/store/onboarding.store';
import { ScreenHeader } from '@/shared/ui/ScreenHeader';
import { useStepBack } from '../hooks/useStepBack';

/**
 * «Перш ніж почати» (ТЗ §5.2): показується один раз, до будь-яких інших екранів. Ілюстрація, короткий опис,
 * блок «не медичний пристрій», три обов'язкові згоди; кнопка активна лише коли відмічено всі три.
 */
export function ConsentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [consent, setConsent] = useState<ConsentState>({ terms: false, disclaimer: false, doctor: false });
  const all = consent.terms && consent.disclaimer && consent.doctor;
  // назад — до вибору мови
  const back = useStepBack(() => {
    useOnboardingStore.getState().resetLanguageChoice();
    router.replace(ROUTES.language);
  });

  return (
    <Screen
      bottomInset
      footer={
        <>
          <Button
            label={t('consent.accept')}
            disabled={!all}
            iconRight="arrow-right"
            onPress={() => {
              useOnboardingStore.getState().acceptConsentLocally();
              router.replace(ROUTES.onboarding);
            }}
          />
          <AppText variant="caption" color="muted" align="center">{t('consent.footer')}</AppText>
        </>
      }
    >
      <ScreenHeader title="" onBack={back} backLabel={t('common.back')} />
      <Reveal>
        <View style={styles.head}>
          <ShieldIllustration size={170} />
          <AppText variant="h1" align="center" color="forest">{t('consent.title')}</AppText>
          <AppText variant="body" align="center" color="soft">{t('consent.intro')}</AppText>
        </View>
      </Reveal>
      <Card tone="warning">
        <View style={styles.notice}>
          <Icon name="info" size={22} color="goldDark" />
          <AppText variant="bodyStrong" color="pillGoldText" style={styles.noticeText}>{t('consent.notMedical')}</AppText>
        </View>
      </Card>
      <Card>
        <ConsentCheckboxes value={consent} onChange={setConsent} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 16 },
  notice: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  noticeText: { flex: 1 },
});
