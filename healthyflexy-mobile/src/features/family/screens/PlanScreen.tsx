import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { toApiError } from '@/api/errors';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingView } from '@/shared/ui/LoadingView';
import { Screen } from '@/shared/ui/Screen';
import { ExerciseMode, type Family } from '@/types';
import { NoFamilyState } from '../components/NoFamilyState';
import { ParentSwitcher } from '../components/ParentSwitcher';
import { PlanForm } from '../components/PlanForm';
import { useFamily } from '../hooks/useFamily';
import { planValuesOf, usePlanDraft } from '../hooks/usePlanDraft';
import { useUpdatePlan } from '../hooks/useUpdatePlan';

/** Таб «План» дитини (ТЗ §7.2): дні занять, ставка, валюта, час нагадування. Зберігається на сервері. */
export function PlanScreen() {
  const family = useFamily();
  if (family.isLoading) return <Screen scroll={false}><LoadingView /></Screen>;
  if (family.data === null) return <NoFamilyState />;
  if (family.isError || !family.data) return <Screen scroll={false}><ErrorState error={family.error} onRetry={() => void family.refetch()} /></Screen>;
  // key лише за сім'єю: після збереження редактор НЕ перемонтовується (перемонтування під час тосту лишало
  // на Android порожній екран — картки не з'являлись), а чернетка сама підхоплює збережений план (usePlanDraft)
  const f = family.data;
  return <PlanEditor key={f.id} family={f} />;
}

function PlanEditor({ family }: { family: Family }) {
  const { t } = useTranslation();
  const draft = usePlanDraft(planValuesOf(family));
  const update = useUpdatePlan();

  return (
    <Screen
      bottomInset={false}
      footer={
        <View style={styles.footer}>
          <Button label={t('plan.save')} icon="check" disabled={!draft.isDirty} loading={update.isPending} onPress={() => update.mutate(draft.toRequest())} />
          <AppText variant="caption" color="muted" align="center">
            {update.isError ? t(`errors.${toApiError(update.error).code}`) : t('plan.appliesFromTomorrow')}
          </AppText>
        </View>
      }
    >
      <ParentSwitcher current={family} />
      <PlanForm draft={draft} withLoad aiMode={family.exerciseMode === ExerciseMode.Ai} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: 6 },
});
