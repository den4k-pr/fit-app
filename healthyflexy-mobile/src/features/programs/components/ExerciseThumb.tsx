import { Image, StyleSheet, View } from 'react-native';
import { CATEGORY_ICON } from '@/constants/exercise-categories';
import { getExercisePoster } from '@/constants/exercise-videos';
import { Icon } from '@/shared/ui/Icon';
import { IconBadge } from '@/shared/ui/IconBadge';
import { colors, radius } from '@/theme';
import type { ExerciseCategory } from '@/types';

/**
 * Мініатюра вправи у списках: кадр із її демо-ролика (у кожної вправи — своя картинка) зі значком «відео».
 * Самі ролики грають на екрані опису й під час виконання — у списку десяток відеоплеєрів перевантажив би телефон.
 */
export function ExerciseThumb({ slug, category, size = 72, showPlay = true }: { slug: string; category: ExerciseCategory; size?: number; showPlay?: boolean }) {
  const poster = getExercisePoster(slug);
  const cat = CATEGORY_ICON[category];
  if (!poster) {
    return (
      <View style={[styles.box, { width: size, height: size }]}>
        <IconBadge icon={cat.icon} tone={cat.tone} size={size * 0.6} shape="round" />
      </View>
    );
  }
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <Image source={poster} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
      {showPlay ? (
        <View style={styles.play} pointerEvents="none">
          <Icon name="play" size={Math.max(10, size * 0.16)} color="white" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.shade, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  play: { position: 'absolute', right: 4, bottom: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, padding: 4 },
});
