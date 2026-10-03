import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ROUTES } from '@/constants/routes';
import { Reveal } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Screen } from '@/shared/ui/Screen';
import { ScreenHeader } from '@/shared/ui/ScreenHeader';
import { UserRole } from '@/types';
import { AuthSteps } from '../components/AuthSteps';
import { RoleCard } from '../components/RoleCard';
import { useSetRole } from '../hooks/useSetRole';
import { useLogout } from '../hooks/useLogout';
import { useStepBack } from '../hooks/useStepBack';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useAuthStore } from '@/store/auth.store';
import { staysInAuth } from '../lib/app-area';

/** «Хто ви?» (ТЗ §5.3): роль обирається один раз і не змінюється */
export function RoleScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  // повернення з наступних кроків: уже обрана роль підсвічена, її можна змінити
  const current = useAuthStore((s) => s.user?.role ?? null);
  const [role, setRole] = useState<UserRole | null>(current);
  const save = useSetRole();
  const logout = useLogout();
  const [confirmBack, setConfirmBack] = useState(false);
  // назад — змінити пошту/номер: це новий вхід, тож спершу вихід із поточного акаунта
  const back = useStepBack(() => setConfirmBack(true));

  return (
    <Screen
      bottomInset
      footer={<Button label={t('common.continue')} iconRight="arrow-right" disabled={!role} loading={save.isPending} onPress={() => role && save.mutate(role, { onSuccess: () => staysInAuth() && router.replace(ROUTES.root) })} />}
    >
      <AuthSteps current={3} />
      <ScreenHeader title={t('auth.role.title')} onBack={back} backLabel={t('common.back')} />
      <Reveal>
        <RoleCard avatar="👵" title={t('auth.role.parent')} description={t('auth.role.parentHint')} selected={role === UserRole.Parent} onPress={() => setRole(UserRole.Parent)} />
      </Reveal>
      <Reveal>
        <RoleCard avatar="🧑" title={t('auth.role.child')} description={t('auth.role.childHint')} selected={role === UserRole.Child} onPress={() => setRole(UserRole.Child)} />
      </Reveal>
      <Reveal>
        <View style={styles.warning}>
          <Icon name="info" size={18} color="muted" />
          <AppText variant="caption" color="muted" style={styles.warningText}>{t('auth.role.warning')}</AppText>
        </View>
      </Reveal>
      {save.error ? <AppText variant="small" color="red" align="center">{t(`errors.${save.error.code}`)}</AppText> : null}
      <ConfirmDialog
        visible={confirmBack}
        title={t('auth.back.changeLoginTitle')}
        message={t('auth.back.changeLoginBody')}
        confirmLabel={t('auth.back.changeLoginYes')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          setConfirmBack(false);
          logout.mutate(undefined, { onSettled: () => router.replace(ROUTES.phone) });
        }}
        onCancel={() => setConfirmBack(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  warning: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 4 },
  warningText: { flexShrink: 1 },
});
