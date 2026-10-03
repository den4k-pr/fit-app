import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { PaginationDots } from '@/features/onboarding/components/PaginationDots';
import { TAB_META } from '@/navigation/tab-meta';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { useOnboardingStore } from '@/store/onboarding.store';
import { colors, radius } from '@/theme';
import { GUIDE_SLIDES, type GuideRole, type GuideSlide } from '../guide.slides';
import { useGuideStore } from '../guide.store';
import { GuideHero } from './GuideHero';

function Slide({ role, slide, index, width, height, scrollX }: { role: GuideRole; slide: GuideSlide; index: number; width: number; height: number; scrollX: SharedValue<number> }) {
  const { t } = useTranslation();
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  // паралакс: ілюстрація й текст зсуваються з різною швидкістю, сусідні слайди бліднуть
  const art = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0.2, 1, 0.2], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(scrollX.value, range, [width * 0.3, 0, -width * 0.3], Extrapolation.CLAMP) },
      { scale: interpolate(scrollX.value, range, [0.82, 1, 0.82], Extrapolation.CLAMP) },
    ],
  }));
  const text = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0.2, 1, 0.2], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(scrollX.value, range, [width * 0.12, 0, -width * 0.12], Extrapolation.CLAMP) }],
  }));
  const key = `guide.${role}.${slide.id}`;
  // назви вкладок у текстах — ті самі, що в панелі вкладок
  const names = { progress: t('tabs.progress'), profile: t('tabs.profile') };
  const tab = slide.tab ? TAB_META[slide.tab] : undefined;
  // ілюстрація поступається місцем тексту на невеликих екранах і з великим системним шрифтом
  const heroSize = Math.min(200, width - 120, height * 0.27);
  return (
    <ScrollView style={{ width, height }} contentContainerStyle={styles.slide} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.heroWrap, art]}>
        <GuideHero icon={slide.icon} tone={slide.tone} accents={slide.accents} size={heroSize} />
      </Animated.View>
      <Animated.View style={[styles.texts, text]}>
        {tab ? (
          <View style={styles.where}>
            <Icon name={tab.icon} size={15} color="forest" />
            <AppText variant="captionStrong" color="forest" numberOfLines={1} style={styles.whereText}>
              {t('guide.where', { tab: t(tab.labelKey as never) as string })}
            </AppText>
          </View>
        ) : null}
        <AppText variant="h2" align="center" color="forest" maxFontSizeMultiplier={1.25}>{t(`${key}.title` as never)}</AppText>
        <AppText variant="body" align="center" color="soft" maxFontSizeMultiplier={1.25}>{t(`${key}.body` as never, names)}</AppText>
        <View style={styles.points}>
          {Array.from({ length: slide.points }, (_, i) => (
            <View key={i} style={styles.point}>
              <View style={styles.bullet}>
                <Icon name="check" size={13} color="white" strokeWidth={3} />
              </View>
              <AppText variant="small" style={styles.pointText} maxFontSizeMultiplier={1.3}>{t(`${key}.p${i + 1}` as never, names)}</AppText>
            </View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

/**
 * Гайд «Як користуватися» (свій для батька/матері й для дитини): гортається пальцем або кнопками,
 * крапки прогресу, «Пропустити». Першого разу відкривається сам (GuideAutoLauncher), далі — з «Профілю».
 */
export function GuideModal() {
  const role = useGuideStore((s) => s.openFor);
  const close = () => {
    if (role) useOnboardingStore.getState().markGuideSeen(role);
    useGuideStore.getState().close();
  };
  return (
    <Modal visible={role !== null} animationType="slide" onRequestClose={close} statusBarTranslucent>
      {/* новий вміст на кожне відкриття: гайд завжди починається з першого слайда */}
      {role ? <GuideBody key={role} role={role} onClose={close} /> : null}
    </Modal>
  );
}

function GuideBody({ role, onClose }: { role: GuideRole; onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  const scroller = useRef<Animated.ScrollView>(null);
  const [index, setIndex] = useState(0);
  const slides = GUIDE_SLIDES[role];
  const last = index === slides.length - 1;
  const pageHeight = Math.max(360, height - (insets.top + 64) - (insets.bottom + 140));

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });
  // ширина сторінки — фактична ширина області гайду (у Modal вона може відрізнятися від ширини вікна:
  // тоді сторінки «з'їжджали», а лічильник випереджав слайд)
  const [pageWidth, setPageWidth] = useState(width);
  const goTo = (i: number) => {
    // у веб-перегляді плавна прокрутка конфліктує зі scroll-snap (сторінка не доїжджала) — там без анімації
    scroller.current?.scrollTo({ x: pageWidth * i, animated: Platform.OS !== 'web' });
    setIndex(i);
  };

  return (
    <View style={styles.root}>
      {/* світле тло: темні значки статус-бару (інакше годинник і батарея не видно) */}
      <StatusBar style="dark" />
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <View style={styles.titleRow}>
          <AppText variant="sectionLabel" color="muted">{t('guide.title')}</AppText>
          <AppText variant="captionStrong" color="green">{t('guide.stepOf', { current: index + 1, total: slides.length })}</AppText>
        </View>
        {last ? <View style={styles.skipSpacer} /> : <Button variant="ghost" size="sm" label={t('guide.skip')} onPress={onClose} />}
      </View>

      <Animated.ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / pageWidth))}
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          if (w > 0 && w !== pageWidth) setPageWidth(w);
        }}
        style={{ height: pageHeight, flexGrow: 0 }}
      >
        {slides.map((slide, i) => (
          <Slide key={slide.id} role={role} slide={slide} index={i} width={pageWidth} height={pageHeight} scrollX={scrollX} />
        ))}
      </Animated.ScrollView>
      {/* м'яке зникання внизу сторінки: якщо текст довший, видно, що його можна прогорнути */}
      <View pointerEvents="none" style={[styles.fade, { top: insets.top + 64 + pageHeight - 28 }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="guideFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.paper} stopOpacity={0} />
              <Stop offset="1" stopColor={colors.paper} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#guideFade)" />
        </Svg>
      </View>

      <View style={[styles.bottom, { paddingBottom: 16 + insets.bottom }]}>
        <PaginationDots count={slides.length} scrollX={scrollX} pageWidth={pageWidth} />
        <View style={styles.buttons}>
          {index > 0 ? (
            <View style={styles.backBtn}>
              <Button variant="secondary" icon="arrow-left" label={t('guide.back')} onPress={() => goTo(index - 1)} />
            </View>
          ) : null}
          <View style={styles.nextBtn}>
            <Button label={t(last ? 'guide.done' : 'guide.next')} iconRight={last ? 'check' : 'arrow-right'} onPress={() => (last ? onClose() : goTo(index + 1))} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999 },
  blobTop: { width: 320, height: 320, top: -170, right: -120, backgroundColor: colors.greenLight, opacity: 0.9 },
  blobBottom: { width: 280, height: 280, bottom: -130, left: -110, backgroundColor: colors.tealBorder, opacity: 0.45 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, minHeight: 64, gap: 12 },
  titleRow: { flexShrink: 1, gap: 2 },
  skipSpacer: { height: 44 },
  slide: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 4, paddingBottom: 32, gap: 14 },
  heroWrap: { alignItems: 'center' },
  texts: { gap: 12, alignItems: 'center', alignSelf: 'stretch' },
  where: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    backgroundColor: colors.greenLight,
    borderColor: colors.greenBorder,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  whereText: { flexShrink: 1 },
  points: { alignSelf: 'stretch', gap: 10, marginTop: 4 },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  pointText: { flex: 1, color: colors.soft },
  fade: { position: 'absolute', left: 0, right: 0, height: 28 },
  bottom: { paddingHorizontal: 16, paddingTop: 12, gap: 18 },
  buttons: { flexDirection: 'row', gap: 10 },
  backBtn: { flex: 1 },
  nextBtn: { flex: 1.4 },
});
