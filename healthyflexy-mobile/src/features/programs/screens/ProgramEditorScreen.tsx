import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingView } from '@/shared/ui/LoadingView';
import { Screen } from '@/shared/ui/Screen';
import { ScreenHeader } from '@/shared/ui/ScreenHeader';
import { SectionLabel } from '@/shared/ui/SectionLabel';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { TextField } from '@/shared/ui/TextField';
import { showToast } from '@/store/ui.store';
import { ProgramDurationType, type Exercise, type Program } from '@/types';
import { ExercisePickerModal } from '../components/ExercisePickerModal';
import { ProgramExerciseRow } from '../components/ProgramExerciseRow';
import { useCreateProgram } from '../hooks/useCreateProgram';
import { useExerciseCatalog } from '../hooks/useExerciseCatalog';
import { useMyPrograms } from '../hooks/useMyPrograms';
import { programValuesOf, useProgramDraft } from '../hooks/useProgramDraft';
import { useUpdateProgram } from '../hooks/useUpdateProgram';

/** Створення/редагування власної програми (ТЗ: адмінка дитини). `id` = 'new' → створення. */
export function ProgramEditorScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const mine = useMyPrograms();
  const catalog = useExerciseCatalog();

  if (mine.isLoading || catalog.isLoading) return <Screen scroll={false}><LoadingView /></Screen>;
  if (mine.isError || catalog.isError || !mine.data || !catalog.data) {
    return (
      <Screen scroll={false}>
        <ErrorState
          error={mine.error ?? catalog.error}
          onRetry={() => {
            void mine.refetch();
            void catalog.refetch();
          }}
        />
      </Screen>
    );
  }

  const existing = isNew ? null : (mine.data.find((p) => p.id === id) ?? null);
  if (!isNew && !existing) {
    return (
      <Screen bottomInset>
        <ScreenHeader title={t('programs.editTitle')} onBack={() => router.back()} backLabel={t('common.back')} />
        <EmptyState title={t('errors.PROGRAM_NOT_FOUND')} action={<Button label={t('common.back')} onPress={() => router.back()} />} />
      </Screen>
    );
  }

  return <ProgramEditor isNew={isNew} programId={isNew ? null : (id ?? null)} existing={existing} catalog={catalog.data} />;
}

interface ProgramEditorProps {
  isNew: boolean;
  programId: string | null;
  existing: Program | null;
  catalog: Exercise[];
}

function ProgramEditor({ isNew, programId, existing, catalog }: ProgramEditorProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const draft = useProgramDraft(existing ? programValuesOf(existing) : undefined);
  const create = useCreateProgram();
  const update = useUpdateProgram();
  const [pickerOpen, setPickerOpen] = useState(false);
  const catalogById = new Map(catalog.map((e) => [e.id, e]));
  const saving = create.isPending || update.isPending;

  const save = () => {
    const body = draft.toRequest();
    const onSuccess = () => {
      showToast(t('programs.saved'));
      router.back();
    };
    if (isNew) create.mutate(body, { onSuccess });
    else if (programId) update.mutate({ id: programId, body }, { onSuccess });
  };

  return (
    <Screen
      bottomInset
      footer={
        <Button
          label={t('programs.save')}
          icon="check"
          disabled={!draft.isDirty || draft.exercises.length === 0 || draft.name.trim().length === 0}
          loading={saving}
          onPress={save}
        />
      }
    >
      <ScreenHeader title={isNew ? t('programs.createTitle') : t('programs.editTitle')} onBack={() => router.back()} backLabel={t('common.back')} />

      <View style={styles.field}>
        <TextField label={t('programs.nameLabel')} value={draft.name} onChangeText={draft.setName} placeholder={t('programs.namePlaceholder')} maxLength={100} />
      </View>
      <View style={styles.field}>
        <TextField label={t('programs.descriptionLabel')} value={draft.description} onChangeText={draft.setDescription} maxLength={500} />
      </View>
      <View style={styles.field}>
        <AppText variant="captionStrong" color="soft" style={styles.durationLabel}>{t('programs.durationLabel')}</AppText>
        <SegmentedControl
          options={[
            { key: ProgramDurationType.Week, label: t('programs.duration.week') },
            { key: ProgramDurationType.Month, label: t('programs.duration.month') },
          ]}
          value={draft.durationType}
          onChange={draft.setDurationType}
        />
      </View>

      <SectionLabel>{t('programs.exercisesSection')}</SectionLabel>
      {draft.exercises.length === 0 ? (
        <EmptyState title={t('programs.noExercises')} />
      ) : (
        draft.exercises.map((item, index) => (
          <ProgramExerciseRow
            key={`${item.exerciseId}-${index}`}
            item={item}
            exercise={catalogById.get(item.exerciseId)}
            onMoveUp={() => draft.moveExercise(index, -1)}
            onMoveDown={() => draft.moveExercise(index, 1)}
            onRemove={() => draft.removeExercise(index)}
            onToggleDay={(day) => draft.toggleExerciseDay(index, day)}
          />
        ))
      )}
      <View style={styles.addButton}>
        <Button variant="secondary" icon="plus" label={t('programs.addExercise')} onPress={() => setPickerOpen(true)} />
      </View>

      <ExercisePickerModal
        visible={pickerOpen}
        selectedIds={draft.exercises.map((e) => e.exerciseId)}
        maxSelected={draft.maxExercises}
        onToggle={draft.toggleExercise}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { paddingHorizontal: 16, marginBottom: 14 },
  durationLabel: { marginBottom: 8 },
  addButton: { paddingHorizontal: 16, marginBottom: 12 },
});
