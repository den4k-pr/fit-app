import type { IconName } from '@/shared/ui/Icon';

/** Що показувати в таб-барі для кожного маршруту (ім'я файла в app/(parent) та app/(child)) */
export const TAB_META: Record<string, { labelKey: string; icon: IconName }> = {
  // батько/мати
  // макет: вкладка батька/матері — «Активність» (блискавка)
  today: { labelKey: 'tabs.activity', icon: 'zap' },
  history: { labelKey: 'tabs.progress', icon: 'progress' },
  account: { labelKey: 'tabs.profile', icon: 'profile' },
  // дитина
  dashboard: { labelKey: 'tabs.dashboard', icon: 'home' },
  progress: { labelKey: 'tabs.progress', icon: 'progress' },
  plan: { labelKey: 'tabs.plan', icon: 'plan' },
  programs: { labelKey: 'tabs.exercises', icon: 'dumbbell' },
  profile: { labelKey: 'tabs.profile', icon: 'profile' },
};
