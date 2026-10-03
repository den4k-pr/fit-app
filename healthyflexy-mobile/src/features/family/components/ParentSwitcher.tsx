import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { PARENT_AVATAR } from '@/constants/relationships';
import { PressableScale } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Avatar } from '@/shared/ui/Avatar';
import { Icon } from '@/shared/ui/Icon';
import { IconButton } from '@/shared/ui/IconButton';
import { useSettingsStore } from '@/store/settings.store';
import { colors, radius, shadows } from '@/theme';
import type { Family } from '@/types';
import { parentLabelOf, useFamilies, useSelectFamily } from '../hooks/useFamilies';
import { AddParentSheet } from './AddParentSheet';
import { RenameParentSheet } from './RenameParentSheet';

/**
 * Перемикач батьків (макет, дашборд дитини): ⚙ перейменувати обраного · «👵 Мама · 👴 Тато» · «+» додати ще одного.
 * Кожен батько/мати — окрема сім'я зі своїм планом, ставкою, програмою й розрахунками.
 */
export function ParentSwitcher({ current }: { current: Family }) {
  const { t } = useTranslation();
  const families = useFamilies();
  const select = useSelectFamily();
  const activeId = useSettingsStore((s) => s.activeFamilyId) ?? current.id;
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const list = families.data ?? [current];

  return (
    <View style={styles.row}>
      <IconButton icon="settings" size={40} accessibilityLabel={t('parents.rename')} onPress={() => setRenaming(true)} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.scroll}>
        {list.map((family) => {
          const active = family.id === activeId;
          return (
            <PressableScale
              key={family.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => select(family.id)}
              haptic
              style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
            >
              <Avatar symbol={PARENT_AVATAR[family.relationship]} uri={family.counterpart.avatarUrl} size={28} tone={active ? 'dark' : 'paper'} />
              <AppText variant="smallStrong" style={{ color: active ? colors.mint : colors.soft }} numberOfLines={1}>
                {parentLabelOf(family)}
              </AppText>
            </PressableScale>
          );
        })}
      </ScrollView>
      <PressableScale accessibilityRole="button" accessibilityLabel={t('parents.add')} onPress={() => setAdding(true)} haptic style={styles.add}>
        <Icon name="plus" size={22} color="white" strokeWidth={2.6} />
      </PressableScale>

      <AddParentSheet visible={adding} onClose={() => setAdding(false)} />
      <RenameParentSheet visible={renaming} family={current} onClose={() => setRenaming(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  scroll: { flex: 1 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.pill, paddingLeft: 4, paddingRight: 14, minHeight: 40, borderWidth: 1, maxWidth: 150 },
  chipActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  chipIdle: { backgroundColor: colors.shade, borderColor: colors.border },
  add: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.greenButton, alignItems: 'center', justifyContent: 'center', ...shadows.button },
});
