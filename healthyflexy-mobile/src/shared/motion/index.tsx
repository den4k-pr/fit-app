import * as Haptics from 'expo-haptics';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '@/theme';

const ease = Easing.out(Easing.cubic);

/**
 * Анімація «появи», що ЗАВЖДИ закінчується звичайним станом React.
 *
 * Чому так (білий екран при перемиканні вкладок, найчастіше на «Прогресі»): анімований стиль Reanimated
 * змінюється на UI-потоці, а в React-пропсах елемента лишається ПОЧАТКОВЕ значення — opacity 0. Коли навігація
 * від'єднує неактивну вкладку й приєднує знову (react-native-screens, Android), нативний вигляд перестворюється
 * з React-пропсів — і весь вміст екрана стає прозорим: лишається лише світлий фон.
 *
 * Тому після завершення елемент рендериться БЕЗ анімованого стилю, а в React-пропсах — явний видимий стан
 * (`SETTLED`), і жодне перестворення його не сховає.
 *
 * Порядок важливий: спершу кінцеве значення анімації ставиться ПРИМУСОВО (на повільному телефоні анімація на
 * UI-потоці могла ще не дійти до кінця, коли спрацював таймер, — і елемент лишався напівпрозорим назавжди:
 * бляклий вміст карток), і лише наступного кадру анімований стиль відчіпляється.
 */
function useEntrance(delay: number, duration: number) {
  const reduced = useReducedMotion();
  const [settled, setSettled] = useState(reduced);
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (settled) return undefined;
    progress.set(withDelay(delay, withTiming(1, { duration, easing: ease })));
    let frame = 0;
    const timer = setTimeout(() => {
      cancelAnimation(progress);
      progress.set(1);
      frame = requestAnimationFrame(() => setSettled(true));
    }, delay + duration + 80);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
    // анімація появи — одна на весь час життя елемента
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { settled, progress };
}

/** Кінцевий (видимий) стан — явно в React-пропсах після появи */
const SETTLED: ViewStyle = { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] };

/** Легка пружина для «вискакуючих» елементів (цифра коду, галочка) */
export function PopIn({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { settled, progress } = useEntrance(0, 260);
  const anim = useAnimatedStyle(() => {
    // легкий «перескок» масштабу наприкінці, як у пружини
    const v = progress.value;
    const overshoot = Math.sin(v * Math.PI) * 0.08;
    return { opacity: Math.min(1, v * 1.6), transform: [{ scale: 0.6 + 0.4 * v + overshoot }] };
  });
  return <Animated.View style={settled ? [style, SETTLED] : [style, anim]}>{children}</Animated.View>;
}

/**
 * Каскад появи: кожна картка/підпис усередині <Screen> бере наступний номер і з'являється з невеликою затримкою.
 * Нічого не треба передавати вручну: достатньо обгорнути екран у <StaggerProvider> (Screen це робить сам).
 */
const StaggerContext = createContext<{ next: () => number } | null>(null);

export function StaggerProvider({ children }: { children: ReactNode }) {
  const [counter] = useState(() => {
    let n = 0;
    return { next: () => n++ };
  });
  return <StaggerContext.Provider value={counter}>{children}</StaggerContext.Provider>;
}

/** Затримка появи цього елемента, мс (перші 9 елементів каскаду, далі без додаткової затримки) */
export function useStaggerDelay(explicitIndex?: number): number {
  const ctx = useContext(StaggerContext);
  const [index] = useState(() => explicitIndex ?? ctx?.next() ?? 0);
  return Math.min(index, 8) * motion.stagger;
}

/**
 * Плавна поява без зміни розмітки: анімуються лише прозорість і зсув (transform), тому блок одразу займає своє місце.
 * (Готові `entering`-анімації Reanimated на web виводять елемент із потоку й «склеюють» сусідів, тому тут своя реалізація.)
 */
export function useRevealStyle(delay = 0, distance = 14) {
  const { settled, progress } = useEntrance(delay, motion.base + 80);
  const anim = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateY: (1 - progress.value) * distance }] }));
  // після появи — без анімованого стилю, з явним видимим станом (див. useEntrance)
  return settled ? SETTLED : anim;
}

export interface RevealProps {
  children: ReactNode;
  /** Явний порядок у каскаді (інакше беремо наступний автоматично) */
  index?: number;
  /** Додаткова затримка, мс */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** Обгортка «з'явитися плавно» (знизу вгору). Порядок у каскаді береться автоматично. */
export function Reveal({ children, index, delay = 0, style }: RevealProps) {
  const base = useStaggerDelay(index);
  const anim = useRevealStyle(base + delay);
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** Лише проявлення (без зсуву): для блоків, що змінюють вміст на місці, наприклад «Телефон / Пошта» */
export function FadeView({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const anim = useRevealStyle(delay, 0);
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** Поява зі збільшенням 0.94 → 1 (плитки статистики, бейджі): м'яко «виростає» на місці, із затримкою для хвилі */
export function ScaleIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const { settled, progress } = useEntrance(delay, motion.base + 60);
  const anim = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scale: 0.94 + 0.06 * progress.value }] }));
  return <Animated.View style={settled ? [style, SETTLED] : [style, anim]}>{children}</Animated.View>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** До якого масштабу стискається при натисканні */
  scaleTo?: number;
  /** Легка вібрація при натисканні (лише на пристрої) */
  haptic?: boolean;
}

/** Натискається «пружинно»: легке стиснення й повернення. Основа для всіх кнопок і карток, що натискаються. */
export function PressableScale({ scaleTo = 0.97, haptic, style, onPressIn, onPressOut, onPress, ...rest }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        scale.set(withTiming(scaleTo, { duration: 90 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { damping: 14, stiffness: 240 }));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic && Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress?.(e);
      }}
      style={[style, animated]}
    />
  );
}
