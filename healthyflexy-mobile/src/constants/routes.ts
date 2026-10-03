import type { Href } from 'expo-router';

/**
 * Усі шляхи застосунку в одному місці. Групи `(auth)`, `(parent)`, `(child)` в URL не входять.
 * Ролі мають різні набори маршрутів; guard у кореневому `_layout.tsx` (Stack.Protected) не пускає «чужі».
 */
export const ROUTES = {
  root: '/',
  // (auth)
  language: '/language',
  consent: '/consent',
  onboarding: '/onboarding',
  phone: '/phone',
  otp: '/otp',
  role: '/role',
  profileSetup: '/profile-setup',
  waitingInvite: '/waiting-invite',
  firstPlan: '/first-plan',
  // (parent)
  parentToday: '/today',
  parentHistory: '/history',
  parentAccount: '/account',
  // (child)
  childDashboard: '/dashboard',
  childProgress: '/progress',
  childPlan: '/plan',
  childProfile: '/profile',
  childPrograms: '/programs',
  // спільні / модальні / повноекранні
  reward: '/reward',
  newSettlement: '/settlement/new',
} as const satisfies Record<string, Href>;

export const exerciseHref = (exerciseId: string, sessionId?: string): Href =>
  sessionId ? `/exercise/${exerciseId}?sessionId=${sessionId}` : `/exercise/${exerciseId}`;
export const photosHref = (recordId: string): Href => `/photos/${recordId}`;
export const joinHref = (code: string): Href => `/join/${code}`;
/** Опис вправи з каталогу спонсора */
export const catalogExerciseHref = (exerciseId: string): Href => `/catalog-exercise/${exerciseId}`;
/** id = 'new' → створення, інакше редагування власної програми */
export const programEditorHref = (id: string): Href => `/program-editor/${id}`;
