import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ROUTES } from '@/constants/routes';
import { PlanForm } from '@/features/family/components/PlanForm';
import { DEFAULT_LOAD, usePlanDraft, type PlanValues } from '@/features/family/hooks/usePlanDraft';
import { CalendarIllustration } from '@/shared/illustrations';
import { Reveal } from '@/shared/motion';
import { Button } from '@/shared/ui/Button';
import { Screen } from '@/shared/ui/Screen';
import { ScreenHeader } from '@/shared/ui/ScreenHeader';
import { useAuthStore } from '@/store/auth.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { Currency, type UpdatePlanRequest } from '@/types';
import { AuthSteps } from '../components/AuthSteps';
import { staysInAuth } from '../lib/app-area';
import { useStepBack } from '../hooks/useStepBack';

/** Стартові значення: Пн, Вт, Чт, Пт, 5 за день; валюта за країною номера (Польща → PLN) */
const defaultPlan = (phone: string | null | undefined): PlanValues => ({
  planDays: [1, 2, 4, 5],
  rate: 5,
  currency: phone?.startsWith('+48') ? Currency.Pln : Currency.Eur,
  reminderTime: '10:00',
  ...DEFAULT_LOAD,
});

/**
 * Крок 5б (ТЗ §5.4): дитина налаштовує перший план ще до того, як батько/мати приєднався.
 * Сім'ї на сервері поки немає, тому план чекає на пристрої й застосовується сам, щойно сім'я з'явиться.
 */
export function FirstPlanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const phone = useAuthStore((s) => s.user?.phone);
  const draft = usePlanDraft(defaultPlan(phone));
  // назад — виправити ім'я (а звідти й роль)
  const back = useStepBack(() => router.replace(ROUTES.profileSetup));

  const finish = (plan?: UpdatePlanRequest) => {
    const store = useOnboardingStore.getState();
    if (plan) store.savePendingPlan(plan);
    else store.skipFirstPlan();
    if (staysInAuth()) router.replace(ROUTES.root);
  };

  return (
    <Screen
      bottomInset
      footer={
        <>
          <Button label={t('firstPlan.next')} iconRight="arrow-right" onPress={() => finish(draft.toRequest())} />
          <Button variant="ghost" size="sm" label={t('firstPlan.skip')} onPress={() => finish()} />
        </>
      }
    >
      <AuthSteps current={5} />
      <Reveal>
        <View style={styles.art}><CalendarIllustration size={150} /></View>
      </Reveal>
      <ScreenHeader title={t('firstPlan.title')} subtitle={t('firstPlan.body')} onBack={back} backLabel={t('common.back')} />
      <PlanForm draft={draft} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  art: { alignItems: 'center', paddingTop: 4 },
});
