import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { CATEGORY_LABEL_KEY } from '@/constants/exercise-categories';
import { EXERCISE_VIDEO_RATIO, getExerciseVideo } from '@/constants/exercise-videos';
import { BenefitBlock } from '@/features/workout/components/BenefitBlock';
import { BodyImpactCard } from '@/features/workout/components/BodyImpactCard';
import { ExerciseHero } from '@/features/workout/components/ExerciseHero';
import { TechniqueBlock } from '@/features/workout/components/TechniqueBlock';
import { formatTarget } from '@/lib/exercise-target';
import { DemoVideoPlayer } from '@/shared/components/DemoVideoPlayer';
import { Reveal } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadingView } from '@/shared/ui/LoadingView';
import { Screen } from '@/shared/ui/Screen';
import { ScreenHeader } from '@/shared/ui/ScreenHeader';
import { SectionLabel } from '@/shared/ui/SectionLabel';
import { borderWidth, colors, radius } from '@/theme';
import { useExerciseCatalog } from '../hooks/useExerciseCatalog';
import { useExerciseSelection } from '../hooks/useExerciseSelection';

/**
 * Опис вправи для спонсора (як демонстрація в акаунті батька/матері): відео, що це за вправа, як виконувати,
 * на що впливає й чим корисна, задіяні м'язи. Унизу — «Включити в щоденні вправи» / «Прибрати».
 */
export function CatalogExerciseScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const catalog = useExerciseCatalog();
  const selection = useExerciseSelection();
  const exercise = catalog.data?.find((e) => e.id === exerciseId);

  if (catalog.isLoading) return <Screen scroll={false}><LoadingView /></Screen>;
  if (!exercise) {
    return (
      <Screen bottomInset>
        <ScreenHeader title={t('exercise.unavailable.title')} onBack={() => router.back()} backLabel={t('common.back')} />
        <EmptyState title={t('exercise.unavailable.body')} action={<Button label={t('common.back')} onPress={() => router.back()} />} />
      </Screen>
    );
  }

  const checked = selection.isSelected(exercise.id);
  const video = getExerciseVideo(exercise.slug);
  const info = exercise.info;

  return (
    <Screen
      bottomInset
      footer={
        <>
          <Button
            variant={checked ? 'ghost' : 'primary'}
            icon={checked ? 'square-check' : 'square'}
            label={t(checked ? 'catalog.detail.remove' : 'catalog.detail.add')}
            onPress={() => selection.toggle(exercise.id)}
          />
          {selection.aiEnabled ? <AppText variant="caption" color="muted" align="center">{t('catalog.detail.aiNote')}</AppText> : null}
        </>
      }
    >
      <ScreenHeader
        title={exercise.name}
        subtitle={`${t(CATEGORY_LABEL_KEY[exercise.category])} · ${formatTarget(exercise, t)} · ${t('plan.minutes', { count: info.durationMin })}`}
        onBack={() => router.back()}
        backLabel={t('common.back')}
      />
      <View style={styles.wrap}>
        <Reveal>
          {video ? (
            <ExerciseHero padded={false}>
              <DemoVideoPlayer source={video} ratio={EXERCISE_VIDEO_RATIO} maxHeight={420} />
            </ExerciseHero>
          ) : exercise.demoVideoUrl ? (
            <ExerciseHero padded={false}>
              <DemoVideoPlayer source={exercise.demoVideoUrl} />
            </ExerciseHero>
          ) : null}
        </Reveal>
        {info.description ? (
          <Reveal>
            <TechniqueBlock description={info.description} />
          </Reveal>
        ) : null}
        <Reveal>
          <BenefitBlock benefit={exercise.benefit} sourceTitle={exercise.sourceTitle} sourceUrl={exercise.sourceUrl} />
        </Reveal>
        {info.muscles.length > 0 ? (
          <Reveal>
            <View style={styles.muscles}>
              <AppText variant="captionStrong" color="forest">{t('catalog.detail.muscles')}</AppText>
              <View style={styles.chips}>
                {info.muscles.map((m) => (
                  <View key={m} style={styles.chip}>
                    <AppText variant="caption" color="forest">{m}</AppText>
                  </View>
                ))}
              </View>
            </View>
          </Reveal>
        ) : null}
      </View>
      {info.bodyImpact ? (
        <>
          <SectionLabel>{t('body.section')}</SectionLabel>
          <BodyImpactCard impacts={[info.bodyImpact]} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, gap: 14 },
  muscles: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: borderWidth.thin, borderRadius: radius.md, padding: 14, gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: colors.greenLight, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
});
