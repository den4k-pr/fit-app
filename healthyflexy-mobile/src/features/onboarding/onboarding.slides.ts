import { ExerciseIllustration, RestIllustration, RewardIllustration, WelcomeIllustration } from '@/shared/illustrations';

/** Слайди онбордингу (4, як у макеті): ілюстрація + тексти (ключі i18n `onboarding.slideN.*`). */
export const ONBOARDING_SLIDES = [
  { id: 1, Illustration: WelcomeIllustration, titleKey: 'onboarding.slide1.title', bodyKey: 'onboarding.slide1.body' },
  { id: 2, Illustration: ExerciseIllustration, titleKey: 'onboarding.slide2.title', bodyKey: 'onboarding.slide2.body' },
  { id: 3, Illustration: RewardIllustration, titleKey: 'onboarding.slide3.title', bodyKey: 'onboarding.slide3.body' },
  // макет: 4-й слайд «Здоров'я і гроші зростають»
  { id: 4, Illustration: RestIllustration, titleKey: 'onboarding.slide4.title', bodyKey: 'onboarding.slide4.body' },
] as const;
