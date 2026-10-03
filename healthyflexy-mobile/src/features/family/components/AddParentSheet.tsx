import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { PLAN } from '@/constants/limits';
import { FadeView } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { TextField } from '@/shared/ui/TextField';
import { Currency, RelationshipType } from '@/types';
import { useCreateInvite } from '../hooks/useCreateInvite';
import { InviteCodeCard } from './InviteCodeCard';
import { LabelQuickPicks } from './LabelQuickPicks';
import { RateSlider } from './RateSlider';
import { RelationshipPicker } from './RelationshipPicker';

/**
 * «Додати акаунт» (макет): хто це, як називати, ставка за день → код запрошення, яким поділитися.
 * Щойно людина введе код, у перемикачі з'явиться новий батько/мати (окрема сім'я).
 */
export function AddParentSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [relationship, setRelationship] = useState<RelationshipType>(RelationshipType.Mom);
  const [label, setLabel] = useState('');
  const [rate, setRate] = useState<number>(PLAN.DEFAULT_RATE);
  const create = useCreateInvite();
  const invite = create.data;

  const close = () => {
    create.reset();
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      title={t('parents.addTitle')}
      onClose={close}
      closeLabel={t('common.cancel')}
      footer={
        invite ? (
          <Button variant="secondary" label={t('common.done')} onPress={close} />
        ) : (
          <>
            <Button
              label={t('parents.createInvite')}
              icon="send"
              loading={create.isPending}
              onPress={() => create.mutate({ relationship, parentLabel: label.trim() || undefined, rate })}
            />
            <Button variant="ghost" label={t('common.cancel')} onPress={close} />
          </>
        )
      }
    >
      {invite ? (
        <FadeView key={invite.code}>
          <AppText variant="small" color="soft" style={styles.hint}>{t('parents.inviteHint')}</AppText>
          <InviteCodeCard invite={invite} />
        </FadeView>
      ) : (
        <>
          <AppText variant="caption" color="muted">{t('invite.whoIs')}</AppText>
          <RelationshipPicker value={relationship} onChange={setRelationship} />
          <TextField label={t('parents.labelField')} value={label} onChangeText={setLabel} placeholder={t('parents.labelPlaceholder')} maxLength={40} />
          <LabelQuickPicks value={label} onPick={setLabel} />
          <RateSlider rate={rate} currency={Currency.Eur} onChange={setRate} />
          {create.isError ? <AppText variant="caption" color="red">{t(`errors.${create.error.code}`)}</AppText> : null}
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: 10 },
});
