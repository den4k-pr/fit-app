import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/shared/ui/AppText';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { TextField } from '@/shared/ui/TextField';
import { showToast } from '@/store/ui.store';
import type { Family } from '@/types';
import { parentLabelOf } from '../hooks/useFamilies';
import { useRenameParent } from '../hooks/useRenameParent';
import { LabelQuickPicks } from './LabelQuickPicks';

interface RenameParentSheetProps {
  visible: boolean;
  family: Family;
  onClose: () => void;
}

/** «Перейменувати» (макет): як називати обраного батька/матір у перемикачі. Кожне відкриття — з поточним підписом */
export function RenameParentSheet(props: RenameParentSheetProps) {
  return props.visible ? <RenameForm key={props.family.id} {...props} /> : null;
}

function RenameForm({ visible, family, onClose }: RenameParentSheetProps) {
  const { t } = useTranslation();
  const [label, setLabel] = useState(parentLabelOf(family));
  const rename = useRenameParent();

  const save = () => {
    const value = label.trim();
    if (!value) return;
    rename.mutate(value, {
      onSuccess: () => {
        showToast(t('parents.renamed', { name: value }));
        onClose();
      },
    });
  };

  return (
    <BottomSheet
      visible={visible}
      title={t('parents.renameTitle')}
      onClose={onClose}
      closeLabel={t('common.cancel')}
      footer={
        <>
          <Button label={t('common.save')} icon="check" disabled={!label.trim()} loading={rename.isPending} onPress={save} />
          <Button variant="ghost" label={t('common.cancel')} onPress={onClose} />
        </>
      }
    >
      <TextField label={t('parents.labelField')} value={label} onChangeText={setLabel} placeholder={t('parents.labelPlaceholder')} maxLength={40} autoFocus />
      <LabelQuickPicks value={label} onPick={setLabel} />
      {rename.isError ? <AppText variant="caption" color="red">{t(`errors.${rename.error.code}`)}</AppText> : null}
    </BottomSheet>
  );
}
