import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { IconBadge } from '@/shared/ui/IconBadge';
import { SectionLabel } from '@/shared/ui/SectionLabel';
import type { PlanDraftController } from '../hooks/usePlanDraft';
import { CurrencyToggle } from './CurrencyToggle';
import { PlanLoadSections } from './PlanLoadSections';
import { RateSlider } from './RateSlider';
import { ReminderTimePicker } from './ReminderTimePicker';
import { WeekdayPicker } from './WeekdayPicker';

/**
 * Поля плану: дні занять, ставка з валютою, час нагадування. Спільні для таба «План» і кроку «перший план».
 * `withLoad` — ще й види навантаження, час тренування, автоускладнення (таб «План», макет).
 */
export function PlanForm({ draft, withLoad, aiMode }: { draft: PlanDraftController; withLoad?: boolean; aiMode?: boolean }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const names = fmt.weekdayNames('short');
  const summary = t('plan.summary', { days: draft.planDays.map((d) => names[d - 1]).join(', '), count: draft.planDays.length });

  return (
    <>
      <SectionLabel>{t('plan.daysSection')}</SectionLabel>
      <Card>
        <View style={styles.head}>
          <IconBadge icon="calendar-check" tone="teal" size={36} shape="squircle" />
          <AppText variant="bodyStrong" style={styles.headText}>{t('plan.chooseDays')}</AppText>
        </View>
        <WeekdayPicker selected={draft.planDays} onToggle={draft.toggleDay} />
        <AppText variant="small" color="muted" style={styles.summary}>{summary}</AppText>
      </Card>

      <SectionLabel>{t('plan.rateSection')}</SectionLabel>
      <Card>
        <RateSlider rate={draft.rate} currency={draft.currency} onChange={draft.setRate} />
        <View style={styles.gap}>
          <CurrencyToggle value={draft.currency} onChange={draft.setCurrency} />
        </View>
        <View style={styles.estimate}>
          <Icon name="trending-up" size={16} color="teal" />
          <AppText variant="small" color="soft" style={styles.headText}>
            {t('plan.estimate', { days: draft.planDays.length, amount: fmt.money(draft.monthlyEstimate, draft.currency) })}
          </AppText>
        </View>
      </Card>

      {withLoad ? <PlanLoadSections draft={draft} aiMode={aiMode} /> : null}

      <SectionLabel>{t('plan.reminderSection')}</SectionLabel>
      <Card>
        <View style={styles.head}>
          <IconBadge icon="bell" tone="teal" size={36} shape="squircle" />
          <AppText variant="small" color="muted" style={styles.headText}>{t('plan.reminderHint')}</AppText>
        </View>
        <ReminderTimePicker value={draft.reminderTime} onChange={draft.setReminderTime} />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  headText: { flex: 1 },
  summary: { marginTop: 12 },
  gap: { marginTop: 14 },
  estimate: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
});
