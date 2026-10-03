import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { EnvelopeIllustration } from '@/shared/illustrations';
import { AppText } from '@/shared/ui/AppText';
import { Card } from '@/shared/ui/Card';
import { Screen } from '@/shared/ui/Screen';
import { SectionLabel } from '@/shared/ui/SectionLabel';
import { useFamily } from '../hooks/useFamily';
import { InviteSection } from './InviteSection';

/**
 * Дитина зареєструвалась, а батько/мати ще не приєднався (ТЗ §5.5, §7.3): пояснення й створення запрошення.
 * Спільний для всіх табів дитини. Сім'я перевіряється сама кожні 8 с, тягнути екран вниз теж можна.
 */
export function NoFamilyState() {
  const { t } = useTranslation();
  const family = useFamily();
  return (
    <Screen refreshing={family.isRefetching} onRefresh={() => void family.refetch()}>
      <SectionLabel>{t('invite.section')}</SectionLabel>
      <Card style={styles.card}>
        <EnvelopeIllustration size={140} />
        <AppText variant="body" color="soft" align="center">{t('dashboard.noFamily')}</AppText>
      </Card>
      <InviteSection />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 6 },
});
