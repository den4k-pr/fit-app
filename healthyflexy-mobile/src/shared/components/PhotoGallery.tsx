import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import { colors, radius, shadows } from '@/theme';
import type { PhotoView } from '@/types';

/** Кадр: поки завантажується, видно спокійну заглушку; готовий кадр плавно проявляється */
function Frame({ uri, label }: { uri: string; label: string }) {
  const opacity = useSharedValue(0);
  // після проявлення — звичайний (не анімований) стиль: інакше при поверненні на екран кадр міг зникнути
  // (див. useEntrance у shared/motion)
  const [shown, setShown] = useState(false);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View style={styles.frame}>
      <Icon name="image" size={34} color="mutedOnDark" />
      <Animated.View style={shown ? [StyleSheet.absoluteFill, { opacity: 1 }] : [StyleSheet.absoluteFill, fade]}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityLabel={label}
          onLoad={() => {
            opacity.set(withTiming(1, { duration: 320 }));
            // спершу примусово кінцеве значення, потім — без анімованого стилю (див. useEntrance)
            setTimeout(() => {
              opacity.set(1);
              requestAnimationFrame(() => setShown(true));
            }, 360);
          }}
        />
      </Animated.View>
    </View>
  );
}

/** Крапка-індикатор: обрана плавно розтягується й стає золотою */
function Dot({ active }: { active: boolean }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 22 : 8, { duration: 220 }),
    backgroundColor: withTiming(active ? colors.green : colors.overlay, { duration: 220 }),
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** Галерея кадрів вправи: гортання вбік, лічильник «1/3» і крапки. Кадри — за підписаними URL сховища (диск сервера або S3/R2). */
export function PhotoGallery({ photos }: { photos: PhotoView[] }) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {photos.map((photo) => (
            <View key={photo.index} style={{ width }}>
              <Frame uri={photo.url} label={t('photos.frame', { index: photo.index, total: photos.length })} />
            </View>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.counter} pointerEvents="none">
        <Icon name="camera" size={13} color="surface" />
        <AppText variant="captionStrong" style={styles.counterText}>{`${page + 1}/${photos.length}`}</AppText>
      </View>
      <View style={styles.dots} accessible accessibilityLabel={t('photos.frame', { index: page + 1, total: photos.length })}>
        {photos.map((photo, i) => (
          <Dot key={photo.index} active={i === page} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.forest, ...shadows.raised },
  frame: { width: '100%', aspectRatio: 3 / 4, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  counter: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.overlay, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  counterText: { color: colors.surface },
  dots: { position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
});
