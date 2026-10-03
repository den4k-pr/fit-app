import { useEvent } from 'expo';
import { useVideoPlayer, VideoView, type VideoPlayer, type VideoSource } from 'expo-video';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/shared/ui/Icon';

export interface DemoVideoPlayerProps {
  source: VideoSource;
  /** Ширина / висота ролика; рамка підлаштовується під нього */
  ratio?: number;
  /** Найбільша висота рамки: вертикальні ролики не займають увесь екран */
  maxHeight?: number;
  /** Зі звуком (можна вимкнути кнопкою) чи завжди без звуку */
  withSound?: boolean;
}

/** Плеєр expo-video — нативний об'єкт: звук перемикається зміною його властивості */
function toggleSound(player: VideoPlayer) {
  player.muted = !player.muted;
}

/**
 * Зациклене демо вправи (ТЗ §6.3, фаза 1): стартує одразу, без системних контролів.
 * Зі звуком — маленька кнопка в кутку вмикає / вимикає його.
 */
export function DemoVideoPlayer({ source, ratio = 4 / 3, maxHeight, withSound = false }: DemoVideoPlayerProps) {
  const { t } = useTranslation();
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = !withSound;
    p.play();
  });
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted });
  const size = maxHeight ? { height: maxHeight, aspectRatio: ratio, maxWidth: '100%' as const } : { width: '100%' as const, aspectRatio: ratio };
  return (
    <View style={[styles.box, size]}>
      <VideoView player={player} nativeControls={false} contentFit="contain" style={styles.video} />
      {withSound ? (
        <Pressable
          onPress={() => toggleSound(player)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t(muted ? 'exercise.soundOn' : 'exercise.soundOff')}
          style={styles.sound}
        >
          <Icon name={muted ? 'volume-off' : 'volume'} size={18} color="white" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'center' },
  video: { width: '100%', height: '100%' },
  sound: {
    position: 'absolute',
    left: 10,
    bottom: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
