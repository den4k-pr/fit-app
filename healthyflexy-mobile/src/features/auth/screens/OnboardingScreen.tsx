import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, useWindowDimensions, type ScrollView } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from '@/constants/routes';
import { OnboardingSlide } from '@/features/onboarding/components/OnboardingSlide';
import { PaginationDots } from '@/features/onboarding/components/PaginationDots';
import { ONBOARDING_SLIDES } from '@/features/onboarding/onboarding.slides';
import { LogoMark } from '@/shared/components/LogoMark';
import { FadeView, Reveal } from '@/shared/motion';
import { Button } from '@/shared/ui/Button';
import { colors } from '@/theme';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useStepBack } from '../hooks/useStepBack';

/** Чотири слайди про застосунок (ТЗ §5.3, макет): гортаються пальцем; «Пропустити» та «Далі» / «Почати» */
export function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const last = index === ONBOARDING_SLIDES.length - 1;
  const bottomBlock = 150 + insets.bottom;
  const topBlock = 64 + insets.top;
  const pageHeight = Math.max(320, height - bottomBlock - topBlock);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const finish = () => {
    useOnboardingStore.getState().markOnboardingSeen();
    router.replace(ROUTES.phone);
  };
  // назад: попередній слайд, а з першого — до згод
  const back = useStepBack(() => {
    if (index === 0) {
      useOnboardingStore.getState().resetConsent();
      router.replace(ROUTES.consent);
      return;
    }
    scroller.current?.scrollTo({ x: width * (index - 1), animated: true });
    setIndex(index - 1);
  });
  const next = () => {
    if (last) return finish();
    scroller.current?.scrollTo({ x: width * (index + 1), animated: true });
    setIndex(index + 1);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />

      <FadeView style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <LogoMark size={34} />
        {last ? <View style={styles.skipSpacer} /> : <Button variant="ghost" size="sm" label={t('onboarding.skip')} onPress={finish} />}
      </FadeView>

      <Animated.ScrollView
        ref={scroller as never}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ height: pageHeight, flexGrow: 0 }}
      >
        {ONBOARDING_SLIDES.map((slide, i) => (
          <OnboardingSlide key={slide.id} Illustration={slide.Illustration} title={t(slide.titleKey)} body={t(slide.bodyKey)} index={i} width={width} height={pageHeight} scrollX={scrollX} />
        ))}
      </Animated.ScrollView>

      <Reveal index={2} style={[styles.bottom, { paddingBottom: 16 + insets.bottom }]}>
        <PaginationDots count={ONBOARDING_SLIDES.length} scrollX={scrollX} pageWidth={width} />
        <View style={styles.buttons}>
          <View style={styles.backBtn}>
            <Button variant="ghost" icon="arrow-left" label={t('common.back')} onPress={back} />
          </View>
          <View style={styles.nextBtn}>
            <Button label={t(last ? 'onboarding.start' : 'common.next')} iconRight="arrow-right" onPress={next} />
          </View>
        </View>
      </Reveal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999 },
  blobTop: { width: 340, height: 340, top: -150, left: -110, backgroundColor: colors.greenLight, opacity: 0.8 },
  blobBottom: { width: 300, height: 300, bottom: -120, right: -100, backgroundColor: colors.tealBorder, opacity: 0.55 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, minHeight: 64 },
  skipSpacer: { height: 44 },
  bottom: { paddingHorizontal: 16, paddingTop: 12, gap: 22 },
  buttons: { flexDirection: 'row', gap: 12 },
  backBtn: { flex: 2 },
  nextBtn: { flex: 3 },
});
