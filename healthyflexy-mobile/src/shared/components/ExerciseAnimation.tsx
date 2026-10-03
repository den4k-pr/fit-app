import { useEffect, useId, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { EXERCISE_ANIMATIONS } from '@/constants/exercise-animations';
import { colors } from '@/theme';
import { faceDetails, headShapes, type FaceDetails, type HeadShapes } from './exercise-figure';
import { RIG_TABLES, buildRig, contactShadow, phaseAt, solvePose } from './exercise-rig';
import {
  FLOOR_Y,
  OUTLINE_W,
  PROP_SHAPES,
  figureGroups,
  groupGeometry,
  scenePalette,
  type FigureGroup,
  type GroupGeometry,
  type Material,
  type ScenePalette,
} from './exercise-scene';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

type Pose = SharedValue<number[]>;
type Head = SharedValue<HeadShapes & FaceDetails>;
type Geo = SharedValue<GroupGeometry>;

/** Шар групи: `pick` дістає потрібний шлях із геометрії кадру (заливка / тінь / лінія) */
function Layer({ geo, pick, fill, stroke, strokeWidth }: { geo: Geo; pick: (g: GroupGeometry) => string; fill: string; stroke?: string; strokeWidth?: number }) {
  const props = useAnimatedProps(() => ({ d: pick(geo.value) }));
  return <AnimatedPath animatedProps={props} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
}

/** Група тіла: контур-силует → заливки матеріалами → тінь і відблиск → лампаси, шви, підошва */
function BodyGroup({ g, pose, front, palette, url }: { g: FigureGroup; pose: Pose; front: boolean; palette: ScenePalette; url: (name: string) => string }) {
  const geo = useDerivedValue(() => groupGeometry(g, pose.value, front));
  const pre = g.depth === 'far' ? 'f' : 'm';
  return (
    <G>
      <Layer geo={geo} pick={pickOutline} fill={palette.outline} stroke={palette.outline} strokeWidth={OUTLINE_W * 2} />
      {g.mats.map((m) => (
        <Layer key={m} geo={geo} pick={FILL_PICKERS[m]} fill={url(`${pre}${m}`)} />
      ))}
      <Layer geo={geo} pick={pickShade} fill={palette.shade} />
      <Layer geo={geo} pick={pickHi} fill={palette.hi} />
      <Layer geo={geo} pick={pickStripe} fill="none" stroke={palette.stripe} strokeWidth={0.9} />
      <Layer geo={geo} pick={pickSeam} fill="none" stroke={palette.seam} strokeWidth={0.9} />
      <Layer geo={geo} pick={pickSole} fill="none" stroke={palette.sole} strokeWidth={1.6} />
    </G>
  );
}

// «вибирачі» шляхів — worklet-и (виконуються на UI-потоці в useAnimatedProps)
function pickOutline(g: GroupGeometry): string {
  'worklet';
  return g.outline;
}
function pickShade(g: GroupGeometry): string {
  'worklet';
  return g.shade;
}
function pickHi(g: GroupGeometry): string {
  'worklet';
  return g.hi;
}
function pickStripe(g: GroupGeometry): string {
  'worklet';
  return g.stripe;
}
function pickSeam(g: GroupGeometry): string {
  'worklet';
  return g.seam;
}
function pickSole(g: GroupGeometry): string {
  'worklet';
  return g.sole;
}
function pickSkin(g: GroupGeometry): string {
  'worklet';
  return g.fills.skin;
}
function pickShirt(g: GroupGeometry): string {
  'worklet';
  return g.fills.shirt;
}
function pickPants(g: GroupGeometry): string {
  'worklet';
  return g.fills.pants;
}
function pickShoe(g: GroupGeometry): string {
  'worklet';
  return g.fills.shoe;
}
const FILL_PICKERS: Record<Material, (g: GroupGeometry) => string> = { skin: pickSkin, shirt: pickShirt, pants: pickPants, shoe: pickShoe };

function HeadPart({ head, shape, fill, stroke, strokeWidth }: { head: Head; shape: keyof (HeadShapes & FaceDetails); fill: string; stroke?: string; strokeWidth?: number }) {
  const props = useAnimatedProps(() => ({ d: head.value[shape] }));
  return <AnimatedPath animatedProps={props} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
}

function ContactShadow({ pose, fill }: { pose: Pose; fill: string }) {
  const props = useAnimatedProps(() => {
    if (pose.value.length === 0) return { cx: 100, rx: 0, ry: 0, opacity: 0 };
    const [cx, rx, opacity] = contactShadow(pose.value, 186);
    return { cx, rx, ry: Math.max(4, rx * 0.2), opacity };
  });
  return <AnimatedEllipse animatedProps={props} cy={FLOOR_Y} fill={fill} />;
}

export interface ExerciseAnimationProps {
  slug: string;
  size?: number;
  tone?: 'dark' | 'light';
}

/** Чи є для вправи власна анімація (інакше показуємо іконку категорії) */
export const hasExerciseAnimation = (slug: string): boolean => slug in EXERCISE_ANIMATIONS;

/**
 * Колір стопу градієнта: rgba(...) → окремо колір і прозорість. Android-версія react-native-svg ігнорує
 * альфу всередині кольору стопу — прозоре світло сцени ставало суцільно білим, тінь підлоги — чорною.
 */
function stop(color: string, k: number): { stopColor: string; stopOpacity: number } {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/.exec(color);
  if (!m) return { stopColor: color, stopOpacity: k };
  const hex = `#${[m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('')}`;
  return { stopColor: hex, stopOpacity: (m[4] === undefined ? 1 : Number(m[4])) * k };
}

const MATERIALS: (Material | 'hair')[] = ['skin', 'shirt', 'pants', 'shoe', 'hair'];

/**
 * Демонстрація вправи: людина з пропорціями дорослого (футболка, джогери, кросівки; голова з волоссям
 * і обличчям) плавно виконує рух по колу. Рух — скелетний (`exercise-rig`): кістки повертаються навколо
 * суглобів і не змінюють довжину, опорні стопи/долоні не ковзають. Форми — `exercise-figure`, сцена й кольори —
 * `exercise-scene` (той самий опис рендериться в Node для перевірки кадрів). Векторна: нуль кілобайт,
 * чітка на будь-якому екрані; нова вправа = нові пози в `constants/exercise-animations.ts`.
 */
export function ExerciseAnimation({ slug, size = 220, tone = 'dark' }: ExerciseAnimationProps) {
  const spec = EXERCISE_ANIMATIONS[slug];
  const rig = useMemo(() => (spec ? buildRig(spec) : null), [spec]);
  const groups = useMemo(() => (spec ? figureGroups(spec.view) : []), [spec]);
  const palette = useMemo(() => scenePalette(tone, colors), [tone]);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const progress = useSharedValue(0);
  const totalMs = rig?.totalMs ?? 0;
  const front = spec?.view === 'front';
  const supine = !!spec?.supine;

  // progress — час від початку кола (мс): темп переходів нерівний (униз повільніше, угору швидше)
  const pose = useDerivedValue(() => (rig ? solvePose(rig, RIG_TABLES, phaseAt(rig, progress.get())) : []), [rig]);
  const head = useDerivedValue(() => ({ ...headShapes(pose.value, front, supine), ...faceDetails(pose.value, front, supine) }), [front, supine]);

  useEffect(() => {
    if (totalMs === 0) return undefined;
    progress.set(0);
    progress.set(withRepeat(withTiming(totalMs, { duration: totalMs, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(progress);
  }, [totalMs, progress]);

  if (!spec) return null;
  const url = (name: string) => `url(#${name}${id})`;
  const edge = { stroke: palette.outline, strokeWidth: OUTLINE_W * 2 };

  return (
    <View style={[styles.box, { width: size, height: size }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          {MATERIALS.flatMap((m) =>
            (['m', 'f'] as const).map((pre) => {
              const c = pre === 'm' ? palette.mat[m] : palette.matFar[m];
              return (
                <LinearGradient key={pre + m} id={`${pre}${m}${id}`} x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={c[0]} />
                  <Stop offset="0.5" stopColor={c[1]} />
                  <Stop offset="1" stopColor={c[2]} />
                </LinearGradient>
              );
            }),
          )}
          <RadialGradient id={`floor${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" {...stop(palette.floor, 1)} />
            <Stop offset="1" {...stop(palette.floor, 0)} />
          </RadialGradient>
          <RadialGradient id={`glow${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" {...stop(palette.glow, 1)} />
            <Stop offset="1" {...stop(palette.glow, 0)} />
          </RadialGradient>
          <RadialGradient id={`stage${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" {...stop(palette.stage, 1)} />
            <Stop offset="1" {...stop(palette.stage, 0)} />
          </RadialGradient>
          <RadialGradient id={`shadow${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" {...stop(palette.shadow, 1)} />
            <Stop offset="1" {...stop(palette.shadow, 0)} />
          </RadialGradient>
        </Defs>

        {/* світло сцени, підлога, предмети */}
        <Circle cx={100} cy={96} r={92} fill={url('glow')} />
        {/* підлога: м'яка тінь без країв (прямокутник давав видимі межі полотна) */}
        <Ellipse cx={100} cy={190} rx={118} ry={30} fill={url('floor')} />
        <Ellipse cx={100} cy={FLOOR_Y} rx={94} ry={12} fill={url('stage')} />
        {spec.props.flatMap((kind) =>
          PROP_SHAPES[kind].map((shape, i) =>
            shape.fill ? (
              <Path key={`${kind}${i}`} d={shape.d} fill={palette.prop[shape.fill]} />
            ) : (
              <Path key={`${kind}${i}`} d={shape.d} stroke={palette.prop[shape.stroke ?? 'edge']} strokeWidth={shape.width ?? 3} strokeLinecap="round" fill="none" />
            ),
          ),
        )}
        <ContactShadow pose={pose} fill={url('shadow')} />

        {groups.map((g, gi) =>
          g.kind === 'head' ? (
            <G key={gi}>
              <HeadPart head={head} shape="skin" fill={palette.outline} {...edge} />
              <HeadPart head={head} shape="hair" fill={palette.outline} {...edge} />
              <HeadPart head={head} shape="nose" fill={palette.outline} {...edge} />
              <HeadPart head={head} shape="skin" fill={url('mskin')} />
              <HeadPart head={head} shape="nose" fill={url('mskin')} />
              <HeadPart head={head} shape="ear" fill={palette.mat.skin[1]} stroke={palette.mat.skin[2]} strokeWidth={0.6} />
              <HeadPart head={head} shape="eye" fill={palette.eye} />
              <HeadPart head={head} shape="brow" fill="none" stroke={palette.brow} strokeWidth={1.1} />
              <HeadPart head={head} shape="mouth" fill="none" stroke={palette.mouth} strokeWidth={1} />
              <HeadPart head={head} shape="hair" fill={url('mhair')} />
              <HeadPart head={head} shape="shine" fill="none" stroke={palette.hairShine} strokeWidth={1.4} />
            </G>
          ) : (
            <BodyGroup key={gi} g={g} pose={pose} front={front} palette={palette} url={url} />
          ),
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
