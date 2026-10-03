import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { CATEGORY_ICON, CATEGORY_LABEL_KEY } from '@/constants/exercise-categories';
import { catalogExerciseHref } from '@/constants/routes';
import { NoFamilyState } from '@/features/family/components/NoFamilyState';
import { ParentSwitcher } from '@/features/family/components/ParentSwitcher';
import { PressableScale } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Card } from '@/shared/ui/Card';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Icon } from '@/shared/ui/Icon';
import { IconBadge } from '@/shared/ui/IconBadge';
import { LoadingView } from '@/shared/ui/LoadingView';
import { Screen } from '@/shared/ui/Screen';
import { SectionLabel } from '@/shared/ui/SectionLabel';
import { ToggleRow } from '@/shared/ui/ToggleRow';
import { colors, radius } from '@/theme';
import { ExerciseCategory, type Exercise } from '@/types';
import { ExerciseCatalogRow } from '../components/ExerciseCatalogRow';
import { useExerciseCatalog } from '../hooks/useExerciseCatalog';
import { useExerciseSelection } from '../hooks/useExerciseSelection';

/** Порядок розділів каталогу */
const SECTION_ORDER: ExerciseCategory[] = [
  ExerciseCategory.Strength,
  ExerciseCategory.Cardio,
  ExerciseCategory.Stretch,
  ExerciseCategory.JointMobility,
  ExerciseCategory.Balance,
  ExerciseCategory.Breathing,
];

/**
 * «Вправи» спонсора: каталог розділами (силові, кардіо, розтяжка, суглобова гімнастика, координація, дихальні).
 * У кожному рядку — мініатюра з рухом; тап — опис вправи з відео (що це, на що впливає, чим корисна); віконце
 * праворуч — галочка «включити в щоденні вправи». Наприкінці — перемикач «Підбір вправ ШІ» (за замовчуванням увімкнено):
 * ШІ сам добирає й чергує вправи та навантаження; коли вимкнено — день складається з відмічених вправ.
 */
export function ExerciseCatalogScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const catalog = useExerciseCatalog();
  const selection = useExerciseSelection();
  const [open, setOpen] = useState<ExerciseCategory | null>(ExerciseCategory.Strength);

  const sections = useMemo(() => {
    const list = catalog.data ?? [];
    return SECTION_ORDER.map((category) => ({
      category,
      items: list.filter((e) => e.category === category).sort((a, b) => a.sortOrder - b.sortOrder),
    })).filter((s) => s.items.length > 0);
  }, [catalog.data]);

  if (selection.family.isLoading || catalog.isLoading) return <Screen scroll={false}><LoadingView /></Screen>;
  if (selection.family.data === null) return <NoFamilyState />;
  if (!selection.family.data || !catalog.data) {
    return (
      <Screen scroll={false}>
        <ErrorState error={selection.family.error ?? catalog.error} onRetry={() => { void catalog.refetch(); void selection.family.refetch(); }} />
      </Screen>
    );
  }

  const openExercise = (exercise: Exercise) => router.push(catalogExerciseHref(exercise.id));
  const selectedCount = selection.selectedIds.length;

  return (
    <Screen refreshing={catalog.isRefetching} onRefresh={() => void catalog.refetch()}>
      <ParentSwitcher current={selection.family.data} />

      <Card tone={selection.aiEnabled ? 'success' : undefined}>
        <View style={styles.modeRow}>
          <IconBadge icon={selection.aiEnabled ? 'sparkles' : 'clipboard'} tone="teal" size={40} shape="squircle" />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{t(selection.aiEnabled ? 'catalog.mode.aiTitle' : 'catalog.mode.manualTitle')}</AppText>
            <AppText variant="caption" color="muted">
              {selection.aiEnabled ? t('catalog.mode.aiBody') : t('catalog.mode.manualBody', { count: selectedCount })}
            </AppText>
          </View>
        </View>
      </Card>

      <SectionLabel>{t('catalog.section')}</SectionLabel>
      <AppText variant="small" color="muted" style={styles.intro}>{t('catalog.intro')}</AppText>

      {sections.map(({ category, items }) => {
        const expanded = open === category;
        const chosen = items.filter((e) => selection.isSelected(e.id)).length;
        const cat = CATEGORY_ICON[category];
        return (
          <Card key={category} flush>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={t(CATEGORY_LABEL_KEY[category])}
              onPress={() => setOpen(expanded ? null : category)}
              scaleTo={0.99}
              style={[styles.sectionHead, expanded && styles.sectionHeadOpen]}
            >
              <IconBadge icon={cat.icon} tone={cat.tone} size={40} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{t(CATEGORY_LABEL_KEY[category])}</AppText>
                <AppText variant="caption" color="muted">
                  {t('catalog.sectionMeta', { count: items.length, chosen })}
                </AppText>
              </View>
              <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="muted" />
            </PressableScale>
            {expanded
              ? items.map((exercise, i) => (
                  <ExerciseCatalogRow
                    key={exercise.id}
                    exercise={exercise}
                    checked={selection.isSelected(exercise.id)}
                    dimmed={selection.aiEnabled}
                    onOpen={openExercise}
                    onToggle={(e) => selection.toggle(e.id)}
                    last={i === items.length - 1}
                  />
                ))
              : null}
          </Card>
        );
      })}

      <SectionLabel>{t('catalog.ai.section')}</SectionLabel>
      <Card>
        <ToggleRow
          icon="sparkles"
          label={t('catalog.ai.label')}
          description={t('catalog.ai.description')}
          value={selection.aiEnabled}
          onValueChange={selection.setAiEnabled}
        />
        <View style={styles.aiFacts}>
          {(['rotate', 'load', 'week'] as const).map((key) => (
            <View key={key} style={styles.aiFact}>
              <Icon name="check" size={14} color="green" strokeWidth={3} />
              <AppText variant="caption" color="soft" style={styles.flex}>{t(`catalog.ai.fact.${key}`)}</AppText>
            </View>
          ))}
        </View>
        {!selection.aiEnabled && selectedCount === 0 ? (
          <View style={styles.warn}>
            <Icon name="info" size={16} color="goldDark" />
            <AppText variant="caption" style={styles.flex}>{t('catalog.ai.nothingSelected')}</AppText>
          </View>
        ) : null}
      </Card>
      <AppText variant="caption" color="muted" align="center" style={styles.footnote}>{t('plan.appliesFromTomorrow')}</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  intro: { marginHorizontal: 16, marginBottom: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  sectionHeadOpen: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.shade },
  aiFacts: { marginTop: 12, gap: 6 },
  aiFact: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  warn: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12, backgroundColor: colors.pillGoldBg, borderRadius: radius.sm, padding: 10 },
  footnote: { marginTop: 8, marginHorizontal: 16 },
});
