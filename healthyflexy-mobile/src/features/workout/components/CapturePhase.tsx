import { CameraView, useCameraPermissions } from 'expo-camera';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { CATEGORY_ICON } from '@/constants/exercise-categories';
import { getExerciseVideo } from '@/constants/exercise-videos';
import { PHOTO } from '@/constants/limits';
import { formatTarget } from '@/lib/exercise-target';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { IconBadge } from '@/shared/ui/IconBadge';
import { LoadingView } from '@/shared/ui/LoadingView';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { colors, radius } from '@/theme';
import type { TodayExercise } from '@/types';
import { say } from '@/services/voice/speech';
import { usePhotoCapture } from '../hooks/usePhotoCapture';
import { buildCuePlan } from '../voice/cue-plan';
import { useVoiceCues } from '../voice/useVoiceCues';
import { CameraPermissionGate } from './CameraPermissionGate';
import { ExerciseHero } from './ExerciseHero';

export interface CapturePhaseProps {
  exercise: TodayExercise;
  /** Кадри готові (замало — камера збоїла, екран попросить пересняти) → починається відправка */
  onCaptured: (uris: string[], frameTimes: number[]) => void;
}

/** Секунд на «приготуйтеся» перед стартом зйомки */
const GET_READY_SECONDS = 5;

/**
 * Фаза 2 — як відеодзвінок: на весь блок беззвучний демо-ролик вправи (повторюйте за ним), а ваша фронтальна
 * камера — маленьке вікно справа внизу. Застосунок сам робить кадри рівномірно за час вправи; відео не
 * записується й ніде не зберігається. Голос проговорює «вдих / видих» мовою застосунку.
 * Зарахування без кадрів немає: без дозволу на камеру вправу не зарахувати.
 */
export function CapturePhase({ exercise, onCaptured }: CapturePhaseProps) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) return <LoadingView />;
  if (!permission.granted) {
    return (
      <View style={styles.wrap}>
        <CameraPermissionGate
          canAskAgain={permission.canAskAgain}
          onRequest={() => void requestPermission()}
        />
      </View>
    );
  }
  return <CapturingStage exercise={exercise} onCaptured={onCaptured} />;
}

function CapturingStage({ exercise, onCaptured }: CapturePhaseProps) {
  const { t } = useTranslation();
  const cameraRef = useRef<CameraView | null>(null);
  const capture = usePhotoCapture(cameraRef, exercise.recordMaxSec, onCaptured);
  const { start } = capture;
  const cat = CATEGORY_ICON[exercise.category];
  const hintIndex = Math.min(4, Math.floor(capture.elapsedSec / PHOTO.HINT_INTERVAL_SECONDS));
  const plan = useMemo(() => buildCuePlan(exercise, exercise.recordMaxSec, t), [exercise, t]);
  useVoiceCues(plan, capture.isRunning, capture.elapsedMs);

  // «Приготуйтеся»: кілька секунд, щоб поставити телефон і відійти; потім зйомка стартує сама
  const [getReady, setGetReady] = useState<number | null>(null);
  const onCameraReady = () => {
    capture.onCameraReady();
    if (getReady !== null) return;
    setGetReady(GET_READY_SECONDS);
    say(t('voice.getReady'), { interrupt: true });
  };
  useEffect(() => {
    if (getReady === null || getReady <= 0) return undefined;
    const timer = setTimeout(() => {
      const left = getReady - 1;
      setGetReady(left);
      if (left > 0 && left <= 3) say(String(left), { interrupt: true });
      if (left === 0) start();
    }, 1000);
    return () => clearTimeout(timer);
  }, [getReady, start]);
  const counting = getReady !== null && getReady > 0;

  const camera = (
    <CameraView
      ref={cameraRef}
      style={StyleSheet.absoluteFill}
      facing="front"
      mode="picture"
      onCameraReady={onCameraReady}
      onMountError={capture.onMountError}
    />
  );
  const demo = getExerciseVideo(exercise.slug);
  const overlays = (
    <>
      <View style={styles.livePill} pointerEvents="none">
        <View style={[styles.liveDot, capture.elapsedSec % 2 === 1 && styles.liveDotDim]} />
        <AppText variant="micro" style={styles.liveText}>{t('exercise.liveBadge').toUpperCase()}</AppText>
      </View>
      <View style={styles.timerPill} pointerEvents="none">
        <AppText variant="mono" style={styles.timerText}>{capture.remainingSec}</AppText>
      </View>
      {counting ? (
        <View style={styles.getReady} pointerEvents="none">
          <AppText variant="timer" align="center" style={styles.getReadyNumber}>{getReady}</AppText>
          <AppText variant="bodyStrong" align="center" style={styles.getReadyText}>{t('exercise.getReady')}</AppText>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={styles.wrap}>
      <ExerciseHero padded={false}>
        {demo ? (
          // відеодзвінок: ролик — «співрозмовник» на весь екран, ваша камера — віконце справа внизу
          <View style={styles.call}>
            <DemoLoop source={demo} />
            <View style={styles.pip}>
              {camera}
              <View style={styles.pipFrame} pointerEvents="none" />
            </View>
            {overlays}
            {!counting ? (
              <View style={[styles.hint, styles.hintBesidePip]} pointerEvents="none">
                <AppText variant="small" style={styles.hintText}>{t(`exercise.hints.${hintIndex}` as 'exercise.hints.0')}</AppText>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.camera}>
            {camera}
            <View style={styles.frame} pointerEvents="none" />
            <View style={styles.silhouette} pointerEvents="none" />
            {overlays}
            {!counting ? (
              <View style={styles.hint} pointerEvents="none">
                <AppText variant="small" align="center" style={styles.hintText}>{t(`exercise.hints.${hintIndex}` as 'exercise.hints.0')}</AppText>
              </View>
            ) : null}
          </View>
        )}
      </ExerciseHero>
      <ProgressBar value={capture.remainingSec} max={exercise.recordMaxSec} height={8} />
      <View style={styles.target}>
        <IconBadge icon={cat.icon} tone={cat.tone} size={40} />
        <View style={styles.targetTexts}>
          <AppText variant="bodyStrong">{exercise.name}</AppText>
          <AppText variant="caption" color="muted">{formatTarget(exercise, t)}</AppText>
        </View>
      </View>
      <Button variant="secondary" icon="check" label={t('exercise.finish')} onPress={capture.finish} disabled={!capture.canFinish} />
    </View>
  );
}

/** Демо-ролик на весь блок: зациклений і ЗАВЖДИ без звуку (озвучує голосовий помічник) */
function DemoLoop({ source }: { source: number }) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView player={player} nativeControls={false} contentFit="cover" style={StyleSheet.absoluteFill} />;
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, gap: 12 },
  camera: { width: '100%', height: 360, backgroundColor: colors.black },
  frame: { ...StyleSheet.absoluteFill, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(51, 178, 110, 0.4)', borderRadius: radius.lg },
  silhouette: { position: 'absolute', top: '11%', left: '22.5%', width: '55%', height: '78%', borderWidth: 2, borderColor: 'rgba(51, 178, 110, 0.3)', borderRadius: radius.md },
  livePill: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0, 0, 0, 0.7)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E24B4A' },
  liveDotDim: { opacity: 0.3 },
  liveText: { color: colors.white, letterSpacing: 1 },
  timerPill: { position: 'absolute', top: 12, right: 12, backgroundColor: colors.greenButton, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 3 },
  timerText: { color: colors.white, fontSize: 16 },
  hint: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: 'rgba(0, 0, 0, 0.65)', borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  hintText: { color: colors.white },
  getReady: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.45)', gap: 6, paddingHorizontal: 24 },
  getReadyNumber: { color: colors.white, fontSize: 88, lineHeight: 96 },
  getReadyText: { color: colors.white },
  call: { width: '100%', height: 480, backgroundColor: colors.black },
  pip: { position: 'absolute', right: 12, bottom: 12, width: 112, height: 150, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.black },
  pipFrame: { ...StyleSheet.absoluteFill, borderRadius: radius.md, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.85)' },
  hintBesidePip: { right: 136 },
  target: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.shade, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border },
  targetTexts: { flex: 1, gap: 2 },
});
