import { useTranslation } from 'react-i18next';
import { CHILD_AVATAR } from '@/constants/relationships';
import { useFamily } from '@/features/family/hooks/useFamily';
import { InviteSection } from '@/features/family/components/InviteSection';
import { useFormat } from '@/shared/hooks/useFormat';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { Divider } from '@/shared/ui/Divider';
import { KeyValueRow } from '@/shared/ui/KeyValueRow';
import { Screen } from '@/shared/ui/Screen';
import { SectionLabel } from '@/shared/ui/SectionLabel';
import { useAuthStore } from '@/store/auth.store';
import { AccountActions } from '../components/AccountActions';
import { AccountSwitcher } from '../components/AccountSwitcher';
import { DisclaimerCard } from '../components/DisclaimerCard';
import { LanguagePicker } from '../components/LanguagePicker';
import { NotificationSettings } from '../components/NotificationSettings';
import { ProfileHeader } from '../components/ProfileHeader';
import { GuideEntry } from '@/features/guide/components/GuideEntry';

/** Профіль дитини (ТЗ §7.3; макет `c-profile`): акаунт, запрошення, мова, сповіщення, безпека, вихід/видалення */
export function ChildProfileScreen() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const user = useAuthStore((s) => s.user);
  const family = useFamily();
  const f = family.data;

  return (
    <Screen>
      <SectionLabel>{t('profile.account')}</SectionLabel>
      <Card>
        <ProfileHeader avatar={CHILD_AVATAR} avatarUrl={user?.avatarUrl} name={user?.name ?? ''} subtitle={t('profile.childRole')} />
        <Divider />
        <KeyValueRow icon={user?.phone ? 'phone' : 'mail'} label={t(user?.phone ? 'profile.phone' : 'profile.email')} value={user?.phone ?? user?.email ?? ''} />
        {f ? <KeyValueRow icon="coins" label={t('profile.rate')} value={t('account.perDay', { amount: fmt.money(f.rate, f.currency) })} /> : null}
        {f ? <KeyValueRow icon="users" label={t('profile.family')} value={<Badge size="sm" tone="success" label={f.counterpart.name ?? ''} />} last /> : null}
      </Card>

      {/* ТЗ §7.3: запрошення потрібне, поки батько/мати не приєднався */}
      {!family.isLoading && !f ? (
        <>
          <SectionLabel>{t('invite.section')}</SectionLabel>
          <InviteSection />
        </>
      ) : null}

      <SectionLabel>{t('accounts.section')}</SectionLabel>
      <AccountSwitcher />

      <SectionLabel>{t('profile.settings')}</SectionLabel>
      <GuideEntry role="child" />
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
