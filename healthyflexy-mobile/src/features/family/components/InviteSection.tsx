import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { FadeView } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { IconBadge } from '@/shared/ui/IconBadge';
import { RelationshipType } from '@/types';
import { useActiveInvite } from '../hooks/useActiveInvite';
import { useCreateInvite } from '../hooks/useCreateInvite';
import { InviteCodeCard } from './InviteCodeCard';
import { RelationshipPicker } from './RelationshipPicker';

/** «Запросити батька/матір»: хто це для вас → код → поділитися (ТЗ §7.3) */
export function InviteSection() {
  const { t } = useTranslation();
  const [relationship, setRelationship] = useState<RelationshipType>(RelationshipType.Mom);
  const active = useActiveInvite();
  const create = useCreateInvite();

  return (
    <Card>
      <View style={styles.head}>
        <IconBadge icon="users" tone="teal" size={42} shape="squircle" />
        <AppText variant="small" color="soft" style={styles.text}>{t('invite.description')}</AppText>
      </View>
      <AppText variant="captionStrong" color="muted" style={styles.label}>{t('invite.whoIs')}</AppText>
      <RelationshipPicker value={relationship} onChange={setRelationship} />
      <View style={styles.action}>
        <Button
          variant={active.data ? 'secondary' : 'primary'}
          icon={active.data ? 'refresh' : 'plus'}
          label={t(active.data ? 'invite.regenerate' : 'invite.create')}
          loading={create.isPending}
          onPress={() => create.mutate({ relationship })}
        />
      </View>
      {active.data ? (
        <FadeView key={active.data.code}>
          <InviteCodeCard invite={active.data} />
        </FadeView>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  text: { flex: 1 },
  label: { marginBottom: 8 },
  action: { marginTop: 16 },
});
