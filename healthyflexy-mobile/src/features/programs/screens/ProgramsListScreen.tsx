import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ParentSwitcher } from '@/features/family/components/ParentSwitcher';
import { useFamily } from '@/features/family/hooks/useFamily';
import { StyleSheet, View } from 'react-native';
import { programEditorHref } from '@/constants/routes';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { IconBadge } from '@/shared/ui/IconBadge';
import { LoadingView } from '@/shared/ui/LoadingView';
import { Screen } from '@/shared/ui/Screen';
import { SectionLabel } from '@/shared/ui/SectionLabel';
import { errorText } from '@/lib/error-text';
import { showToast } from '@/store/ui.store';
import type { Program } from '@/types';
import { ProgramCard } from '../components/ProgramCard';
import { ProgramDetailsSheet } from '../components/ProgramDetailsSheet';
import { useAssignProgram } from '../hooks/useAssignProgram';
import { useCurrentAssignment } from '../hooks/useCurrentAssignment';
import { useMyPrograms } from '../hooks/useMyPrograms';
import { usePresetPrograms } from '../hooks/usePresetPrograms';

/** Таб «Програми» дитини: активна програма, готові пресети, власні програми, створення нової */
export function ProgramsListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const assignment = useCurrentAssignment();
  // програма призначається обраному в перемикачі батьку/матері (кожна сім'я — своя програма)
  const family = useFamily();
  const presets = usePresetPrograms();
  const mine = useMyPrograms();
  const assign = useAssignProgram();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  if (presets.isLoading || mine.isLoading || assignment.isLoading) {
    return <Screen scroll={false}><LoadingView /></Screen>;
  }
  if (presets.isError || mine.isError || !presets.data || !mine.data) {
    return (
      <Screen scroll={false}>
        <ErrorState
          error={presets.error ?? mine.error}
          onRetry={() => {
            void presets.refetch();
            void mine.refetch();
            void assignment.refetch();
          }}
        />
      </Screen>
    );
  }

  const all: Program[] = [...presets.data, ...mine.data];
  const activeProgramId = assignment.data?.programId ?? null;
  const confirmProgram = all.find((p) => p.id === confirmId) ?? null;
  const detailsProgram = all.find((p) => p.id === detailsId) ?? null;

  const handleAssign = () => {
    const program = all.find((p) => p.id === confirmId);
    setConfirmId(null);
    if (!program) return;
    assign.mutate(program, {
      onSuccess: () => showToast(t('programs.assigned')),
      onError: (error) => showToast(errorText(t, error)),
    });
  };
  // яку програму зараз призначаємо (для індикатора на її кнопці)
  const assigningId = assign.isPending ? assign.variables?.id ?? null : null;

  const openEditor = (id: string) => {
    setDetailsId(null);
    router.push(programEditorHref(id));
  };
  const requestAssign = (id: string) => {
    setDetailsId(null);
    setConfirmId(id);
  };

  return (
    <Screen>
      {family.data ? <ParentSwitcher current={family.data} /> : null}
      <SectionLabel>{t('programs.title')}</SectionLabel>
      {assignment.data ? (
        <Card tone="dark">
          <View style={styles.activeRow}>
            <IconBadge icon="sparkles" tone="gold" size={42} shape="squircle" />
            <View style={styles.activeTexts}>
              <AppText variant="small" color="mutedOnDark">{t('programs.active')}</AppText>
              <AppText variant="bodyStrong" color="mint">{assignment.data.programName}</AppText>
            </View>
          </View>
        </Card>
      ) : (
        <Card tone="warning">
          <AppText variant="bodyStrong">{t('programs.noActive')}</AppText>
          <AppText variant="small" color="soft" style={styles.noActiveBody}>{t('programs.noActiveBody')}</AppText>
        </Card>
      )}

      <SectionLabel>{t('programs.presets')}</SectionLabel>
      {presets.data.map((program) => (
        <ProgramCard
          key={program.id}
          program={program}
          isActive={program.id === activeProgramId}
          onAssign={() => requestAssign(program.id)}
          onOpenDetails={() => setDetailsId(program.id)}
          assignLoading={assigningId === program.id}
        />
      ))}

      <SectionLabel>{t('programs.mine')}</SectionLabel>
      {mine.data.length === 0 ? (
        <EmptyState title={t('programs.noOwn')} />
      ) : (
        mine.data.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            isActive={program.id === activeProgramId}
            onAssign={() => requestAssign(program.id)}
            onEdit={() => openEditor(program.id)}
            onOpenDetails={() => setDetailsId(program.id)}
            assignLoading={assigningId === program.id}
          />
        ))
      )}
      <View style={styles.createButton}>
        <Button variant="secondary" icon="plus" label={t('programs.createNew')} onPress={() => router.push(programEditorHref('new'))} />
      </View>

      <ProgramDetailsSheet
        program={detailsProgram}
        isActive={detailsProgram?.id === activeProgramId}
        canEdit={!!detailsProgram && !detailsProgram.isPreset}
        assignLoading={!!detailsProgram && assigningId === detailsProgram.id}
        onAssign={() => detailsProgram && requestAssign(detailsProgram.id)}
        onEdit={() => detailsProgram && openEditor(detailsProgram.id)}
        onClose={() => setDetailsId(null)}
      />

      <ConfirmDialog
        visible={confirmProgram !== null}
        title={t('programs.assignConfirm.title')}
        message={t('programs.assignConfirm.body')}
        confirmLabel={t('programs.assignConfirm.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleAssign}
        onCancel={() => setConfirmId(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeTexts: { flex: 1, gap: 2 },
  noActiveBody: { marginTop: 6 },
  createButton: { paddingHorizontal: 16, marginBottom: 12 },
});
