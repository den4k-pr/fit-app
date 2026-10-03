import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { CHILD_AVATAR } from '@/constants/relationships';
import { PressableScale } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { useAuthStore } from '@/store/auth.store';
import { borderWidth, colors, radius } from '@/theme';
import { UserRole } from '@/types';
import { useAddAccount, useSavedAccounts, useSwitchAccount } from '../hooks/useSavedAccounts';

const ROLE_AVATAR = { [UserRole.Parent]: '👵', [UserRole.Child]: CHILD_AVATAR } as const;

/**
 * «Акаунти» (профіль): дві швидкі кнопки «Батько / Дитина» і список усіх акаунтів, у які входили
 * на цьому телефоні. Перехід миттєвий — без коду з SMS/пошти. «+ Додати акаунт» — вхід в інший акаунт.
 */
export function AccountSwitcher() {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const accounts = useSavedAccounts();
  const switchTo = useSwitchAccount();
  const addAccount = useAddAccount();
  const list = accounts.data ?? [];
  const latestOf = (role: UserRole) => list.find((a) => a.role === role && a.userId !== me?.id);
  // однакові імена (напр., обидва тестові акаунти «Денис»): до імені додаємо контакт, щоб їх розрізнити
  const nameCount = new Map<string, number>();
  for (const a of list) if (a.name) nameCount.set(a.name, (nameCount.get(a.name) ?? 0) + 1);
  const titleOf = (a: (typeof list)[number]) =>
    !a.name ? a.contact : (nameCount.get(a.name) ?? 0) > 1 && a.contact ? `${a.name} · ${a.contact}` : a.name;

  const quick = (role: UserRole) => {
    const active = me?.role === role;
    const target = latestOf(role);
    return (
      <PressableScale
        key={role}
        accessibilityRole="button"
        accessibilityState={{ selected: active, disabled: !active && !target }}
        disabled={active || !target || switchTo.isPending}
        onPress={() => target && switchTo.mutate(target.userId)}
        haptic
        style={[styles.quick, active ? styles.quickActive : null, !active && !target ? styles.quickOff : null]}
      >
        <AppText variant="bodyStrong" color={active ? 'white' : 'forest'}>
          {`${ROLE_AVATAR[role]}  ${t(role === UserRole.Parent ? 'accounts.parent' : 'accounts.child')}`}
        </AppText>
      </PressableScale>
    );
  };

  return (
    <Card>
      <View style={styles.quickRow}>{[UserRole.Parent, UserRole.Child].map(quick)}</View>
      {list.map((account, i) => {
        const current = account.userId === me?.id;
        return (
          <PressableScale
            key={account.userId}
            accessibilityRole="button"
            disabled={current || switchTo.isPending}
            onPress={() => switchTo.mutate(account.userId)}
            style={[styles.row, i < list.length - 1 && styles.divider]}
          >
            <Avatar symbol={account.role ? ROLE_AVATAR[account.role] : '🙂'} size={38} tone={current ? 'dark' : 'paper'} />
            <View style={styles.texts}>
              <AppText variant="bodyStrong" numberOfLines={1}>{titleOf(account)}</AppText>
              <View style={styles.meta}>
                {account.role ? (
                  <Badge
                    size="sm"
                    tone={account.role === UserRole.Parent ? 'warning' : 'success'}
                    label={t(account.role === UserRole.Parent ? 'accounts.parent' : 'accounts.child')}
                  />
                ) : null}
                <AppText variant="caption" color="muted" numberOfLines={1} style={styles.contact}>{account.contact}</AppText>
              </View>
            </View>
            {current ? <Badge size="sm" tone="success" label={t('accounts.current')} /> : <Icon name="chevron-right" size={18} color="muted" />}
          </PressableScale>
        );
      })}
      {switchTo.isError ? <AppText variant="caption" color="red" style={styles.error}>{t('accounts.expired')}</AppText> : null}
      <View style={styles.add}>
        <Button variant="secondary" size="sm" icon="plus" label={t('accounts.add')} loading={switchTo.isPending} onPress={() => void addAccount()} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  quick: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: radius.pill, borderWidth: borderWidth.medium, borderColor: colors.greenBorder, backgroundColor: colors.greenLight },
  quickActive: { backgroundColor: colors.greenButton, borderColor: colors.greenButton },
  quickOff: { opacity: 0.45 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { borderBottomWidth: borderWidth.thin, borderBottomColor: colors.border },
  texts: { flex: 1, gap: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contact: { flex: 1 },
  error: { marginTop: 8 },
  add: { alignItems: 'flex-start', marginTop: 10 },
});
