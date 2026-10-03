import { useTranslation } from 'react-i18next';
import { PARENT_AVATAR } from '@/constants/relationships';
import { useFamily } from '@/features/family/hooks/useFamily';
import { useFamilyStats } from '@/features/family/hooks/useFamilyStats';
import { MoneyOverview } from '@/features/ledger/components/MoneyOverview';
import { PLAN } from '@/constants/limits';
import { useFormat } from '@/shared/hooks/useFormat';
import { Card } from '@/shared/ui/Card';
import { Divider } from '@/shared/ui/Divider';
import { ErrorState } from '@/shared/ui/ErrorState';
import { KeyValueRow } from '@/shared/ui/KeyValueRow';
import { LoadingView } from '@/shared/ui/LoadingView';
import { Screen } from '@/shared/ui/Screen';
import { SectionLabel } from '@/shared/ui/SectionLabel';
import { useAuthStore } from '@/store/auth.store';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui/AppText';
import { AccountActions } from '../components/AccountActions';
import { AccountSwitcher } from '../components/AccountSwitcher';
import { DisclaimerCard } from '../components/DisclaimerCard';
import { LanguagePicker } from '../components/LanguagePicker';
import { NotificationSettings } from '../components/NotificationSettings';
import { ProfileHeader } from '../components/ProfileHeader';
import { GuideEntry } from '@/features/guide/components/GuideEntry';

/** Профіль батька/матері (ТЗ §6.5; макет `p-profile`): хто платить і скільки, «до отримання», мова, сповіщення, безпека */
export function ParentAccountScreen() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const user = useAuthStore((s) => s.user);
  const family = useFamily();
  const stats = useFamilyStats();

  if (family.isLoading || stats.isLoading) return <Screen scroll={false}><LoadingView /></Screen>;
  if (!family.data || !stats.data) return <Screen scroll={false}><ErrorState error={family.error ?? stats.error} onRetry={() => { void family.refetch(); void stats.refetch(); }} /></Screen>;

  const f = family.data;
  // «Каждый день» / «По будням» / «По выходным» — коротше за «Пн, Вт, Ср, Чт, Пт, Сб, Вс» у три рядки
  const sorted = [...f.planDays].sort((a, b) => a - b).join(',');
  const days =
    sorted === '1,2,3,4,5,6,7'
      ? t('plan.days.every')
      : sorted === '1,2,3,4,5'
        ? t('plan.days.workdays')
        : sorted === '6,7'
          ? t('plan.days.weekends')
          : f.planDays.map((d) => fmt.weekdayNames('short')[d - 1]).join(', ');

  return (
    <Screen>
      <SectionLabel>{t('account.section')}</SectionLabel>
      <Card>
        <ProfileHeader
          avatar={PARENT_AVATAR[f.relationship]}
          avatarUrl={user?.avatarUrl}
          name={user?.name ?? ''}
          subtitle={[user?.age ? t('account.age', { count: user.age }) : null, t(`account.levelName.${Math.min(f.level, PLAN.LEVEL_MAX) as 1 | 2 | 3 | 4 | 5}`)].filter(Boolean).join(' · ')}
        />
        <AppText variant="small" color="muted" style={styles.paysYou}>
          {t('account.paysYou', { name: f.counterpart.name ?? '', amount: fmt.money(f.rate, f.currency) })}
        </AppText>
        <Divider />
        <KeyValueRow icon="coins" label={t('account.rate')} value={t('account.perDay', { amount: fmt.money(f.rate, f.currency) })} />
        <KeyValueRow icon="trending-up" label={t('account.level')} value={`${f.level} / ${PLAN.LEVEL_MAX}`} />
        <KeyValueRow icon="calendar-check" label={t('account.days')} value={days} last />
      </Card>

      <SectionLabel>{t('money.section')}</SectionLabel>
      <View style={styles.money}>
        <MoneyOverview stats={stats.data} />
        <AppText variant="caption" color="muted" style={styles.moneyHint}>{t('account.owedHint')}</AppText>
      </View>

      <SectionLabel>{t('accounts.section')}</SectionLabel>
      <AccountSwitcher />

      <SectionLabel>{t('profile.settings')}</SectionLabel>
      <GuideEntry role="parent" />
      <Card>
        <LanguagePicker />
        <Divider />
        <NotificationSettings />
      </Card>

      <SectionLabel>{t('profile.security')}</SectionLabel>
      <DisclaimerCard />
      <AccountActions />
    </Screen>
  );
}

const styles = StyleSheet.create({
  paysYou: { marginTop: -4 },
  money: { paddingHorizontal: 16, marginBottom: 12 },
  moneyHint: { marginTop: 8 },
});
