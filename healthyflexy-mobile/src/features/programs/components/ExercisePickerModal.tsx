import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { CATEGORY_ICON } from '@/constants/exercise-categories';
import { BenefitLine } from '@/shared/components/BenefitLine';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { IconBadge } from '@/shared/ui/IconBadge';
import { LoadingView } from '@/shared/ui/LoadingView';
import { SelectTile } from '@/shared/ui/SelectTile';
import { colors, radius, shadows } from '@/theme';
import type { Exercise } from '@/types';
import { useExerciseCatalog } from '../hooks/useExerciseCatalog';

export interface ExercisePickerModalProps {
  visible: boolean;
  selectedIds: string[];
  /** Ліміт вправ у програмі (з CRM): коли набрано — невибрані вправи недоступні */
  maxSelected: number;
  onToggle: (exerciseId: string) => void;
  onClose: () => void;
}

function CatalogItem({ exercise, selected, disabled, onPress }: { exercise: Exercise; selected: boolean; disabled: boolean; onPress: () => void }) {
  const icon = CATEGORY_ICON[exercise.category];
  return (
    <SelectTile selected={selected} disabled={disabled} onPress={onPress} accessibilityLabel={exercise.name} showCheck style={styles.tile} innerStyle={styles.tileInner}>
      <IconBadge icon={icon.icon} tone={icon.tone} size={36} shape="squircle" />
      <View style={styles.tileText}>
        <AppText variant="smallStrong">{exercise.name}</AppText>
        <BenefitLine benefit={exercise.benefit} />
      </View>
    </SelectTile>
  );
}

/** Модалка каталогу безпечних вправ: тап додає/прибирає вправу з чернетки програми (мультивибір) */
export function ExercisePickerModal({ visible, selectedIds, maxSelected, onToggle, onClose }: ExercisePickerModalProps) {
  const { t } = useTranslation();
  const catalog = useExerciseCatalog();
  const full = selectedIds.length >= maxSelected;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={styles.root}>
        <View style={styles.header}>
          <AppText variant="h2" align="center">{t('programs.catalogTitle')}</AppText>
          <AppText variant="caption" color={full ? 'red' : 'muted'} align="center">
            {t('programs.selectedOfMax', { count: selectedIds.length, max: maxSelected })}
          </AppText>
        </View>
        {catalog.isLoading ? (
          <LoadingView />
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {(catalog.data ?? []).map((exercise) => (
              <CatalogItem
                key={exercise.id}
                exercise={exercise}
                selected={selectedIds.includes(exercise.id)}
                disabled={full && !selectedIds.includes(exercise.id)}
                onPress={() => onToggle(exercise.id)}
              />
            ))}
          </ScrollView>
        )}
        <View style={styles.footer}>
          <Button label={t('common.done')} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 20 },
  tile: { width: '100%' },
  tileInner: { flexDirection: 'row', justifyContent: 'flex-start', gap: 12, paddingVertical: 12 },
  tileText: { flex: 1 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, ...shadows.card, borderRadius: radius.md },
});
