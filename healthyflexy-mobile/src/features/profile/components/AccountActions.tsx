import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { env } from '@/config/env';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { errorText } from '@/lib/error-text';
import { showToast } from '@/store/ui.store';
import { useDeleteAccount } from '../hooks/useDeleteAccount';

/**
 * «Вийти», «Вийти на всіх пристроях» (загублений телефон), «Видалити акаунт» (ТЗ §15.4) і версія.
 * Небезпечні дії завжди з підтвердженням простими словами (ТЗ §17).
 */
export function AccountActions() {
  const { t } = useTranslation();
  const logout = useLogout();
  const remove = useDeleteAccount();
  const [confirm, setConfirm] = useState<'delete' | 'everywhere' | null>(null);
  const busy = logout.isPending || remove.isPending;

  return (
    <View style={styles.wrap}>
      <Button variant="secondary" icon="logout" label={t('profile.logout')} loading={logout.isPending} disabled={busy} onPress={() => logout.mutate()} />
      <Button variant="ghost" icon="shield" label={t('profile.logoutEverywhere')} disabled={busy} onPress={() => setConfirm('everywhere')} />
      <Button variant="danger" icon="trash" label={t('profile.deleteAccount')} loading={remove.isPending} disabled={busy} onPress={() => setConfirm('delete')} />
      <AppText variant="caption" color="muted" align="center" style={styles.version}>{t('profile.version', { version: env.appVersion })}</AppText>

      <ConfirmDialog
        visible={confirm === 'everywhere'}
        title={t('profile.logoutEverywhereConfirm.title')}
        message={t('profile.logoutEverywhereConfirm.body')}
        confirmLabel={t('profile.logoutEverywhereConfirm.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          // діалог закриваємо ОДРАЗУ: екран під відкритим Modal прибирає навігація після виходу — на iOS це
          // зависання/виліт; хід виконання видно на кнопці
          setConfirm(null);
          logout.mutate({ everywhere: true });
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        visible={confirm === 'delete'}
        destructive
        title={t('profile.deleteConfirm.title')}
        message={t('profile.deleteConfirm.body')}
        confirmLabel={t('profile.deleteConfirm.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          setConfirm(null);
          remove.mutate(undefined, { onError: (error) => showToast(errorText(t, error)) });
        }}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, gap: 10, marginTop: 4, marginBottom: 8 },
  version: { marginTop: 6 },
});
