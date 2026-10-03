import type { IconName } from '@/shared/ui/Icon';
import type { IconTone } from '@/shared/ui/IconBadge';

export type GuideRole = 'parent' | 'child';

/**
 * Слайд гайду «Як користуватися»: головна іконка й «супутники» навколо (жива ілюстрація),
 * вкладка, де це живе (мітка «Де: вкладка …» — назва та сама, що в панелі вкладок), і ключі текстів
 * `guide.<role>.<id>.title / body / p1…p3`.
 */
export interface GuideSlide {
  id: string;
  icon: IconName;
  tone: IconTone;
  accents: IconName[];
  /** Маршрут вкладки (ключ TAB_META) */
  tab?: string;
  points: number;
}

/** Коротко й лише про функції цієї ролі: батько/мати — виконує вправи, спонсор — керує планом і грошима */
export const GUIDE_SLIDES: Record<GuideRole, GuideSlide[]> = {
  parent: [
    { id: 'welcome', icon: 'hand-heart', tone: 'gold', accents: ['heart', 'coins', 'sparkles'], points: 2 },
    { id: 'today', icon: 'zap', tone: 'teal', accents: ['play', 'camera', 'volume'], tab: 'today', points: 2 },
    { id: 'money', icon: 'coins', tone: 'gold', accents: ['piggy', 'banknote', 'check-circle'], tab: 'history', points: 1 },
    { id: 'safety', icon: 'shield', tone: 'teal', accents: ['bell-ring', 'heart-pulse', 'settings'], tab: 'account', points: 2 },
  ],
  child: [
    { id: 'welcome', icon: 'hand-heart', tone: 'gold', accents: ['heart', 'users', 'sparkles'], points: 2 },
    { id: 'overview', icon: 'home', tone: 'forest', accents: ['bell-ring', 'image', 'plus'], tab: 'dashboard', points: 2 },
    { id: 'plan', icon: 'calendar-check', tone: 'strength', accents: ['clock', 'coins', 'trending-up'], tab: 'plan', points: 1 },
    { id: 'programs', icon: 'dumbbell', tone: 'stretch', accents: ['sparkles', 'check', 'clipboard'], tab: 'programs', points: 1 },
    { id: 'money', icon: 'wallet', tone: 'gold', accents: ['banknote', 'send', 'check-circle'], tab: 'dashboard', points: 1 },
  ],
};
