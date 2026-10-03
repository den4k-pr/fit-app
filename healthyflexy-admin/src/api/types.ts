export type Lang = 'uk' | 'ru' | 'pl' | 'en';
export type LocalizedText = Record<Lang, string>;
export type LocalizedInput = { uk: string; ru?: string; pl?: string; en?: string };

export interface BodyImpact {
  muscles: number;
  heart: number;
  brain: number;
  bones: number;
  energy: number;
}

export interface Exercise {
  id: string;
  slug: string;
  sortOrder: number;
  category: string;
  name: LocalizedText;
  benefit: LocalizedText;
  description: LocalizedText | null;
  safetyInstructions: LocalizedText | null;
  aiCriteria: string | null;
  targetReps: number | null;
  targetSeconds: number | null;
  targetSteps: number | null;
  recordMaxSec: number;
  demoVideoUrl: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  workoutTypes: string[];
  durationMin: number;
  bodyImpact: BodyImpact | null;
  muscles: LocalizedText[] | null;
  isActive: boolean;
  managedByAdmin: boolean;
  updatedAt: string;
  variantGroup: string | null;
  voicePattern: string | null;
  usage?: { programs: number; done: number };
}

export interface ProgramExercise {
  exerciseId: string;
  slug: string;
  name: LocalizedText;
  category: string;
  targetReps: number | null;
  targetSeconds: number | null;
  targetSteps: number | null;
  defaults: { targetReps: number | null; targetSeconds: number | null; targetSteps: number | null };
  planDays: number[];
}

export interface Program {
  id: string;
  slug: string | null;
  name: LocalizedText;
  description: LocalizedText | null;
  highlights: LocalizedText[];
  durationType: 'week' | 'month';
  archivedAt: string | null;
  managedByAdmin: boolean;
  updatedAt: string;
  exercises: ProgramExercise[];
  families?: number;
}

export interface UserStats {
  families: number;
  completedDays: number;
  missedDays: number;
  exercisesDone: number;
  earned: number;
  aiAttempts: number;
  aiAccepted: number;
  lastActivityAt: string | null;
}

export interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: 'parent' | 'child' | null;
  language: Lang;
  createdAt: string;
  lastLoginAt: string | null;
  blockedAt: string | null;
  stats: UserStats;
}

export interface UserDetail {
  user: UserRow & { age: number | null; timezone: string; pushEnabled: boolean; gdprConsentAt: string | null };
  families: {
    id: string;
    rate: number;
    currency: string;
    planDays: number[];
    workoutMinutes: number;
    createdAt: string;
    childId: string;
    childName: string | null;
    parentId: string;
    parentName: string | null;
    parentLabel: string | null;
    programName: string | null;
  }[];
  sessions: {
    id: string;
    familyId: string;
    date: string;
    status: string;
    exercisesDone: number;
    exercisesTotal: number;
    earned: number;
  }[];
  attempts: {
    id: string;
    analyzedAt: string;
    isCorrect: boolean;
    score: number;
    feedback: string;
    issues: { fromSec: number; toSec: number; reason: string }[] | null;
    exerciseName: string;
  }[];
  ledger: { id: string; type: string; status: string; amount: number; currency: string; createdAt: string }[];
  activity: { date: string; done: number; earned: number }[];
}

export interface Analytics {
  totals: {
    users: number;
    parents: number;
    children: number;
    noRole: number;
    blocked: number;
    newUsers: number;
    activeWeek: number;
    families: number;
    activeFamiliesWeek: number;
    completedDays: number;
    completionRate: number;
    exercisesDone: number;
    earned: number;
    settled: number;
    aiAttempts: number;
    aiAcceptRate: number;
    aiAvgScore: number;
    activeExercises: number;
    presets: number;
    customPrograms: number;
  };
  series: {
    date: string;
    signups: number;
    completed: number;
    missed: number;
    exercises: number;
    earned: number;
    aiAttempts: number;
    aiAccepted: number;
  }[];
  topExercises: { id: string; slug: string; name: string; category: string; done: number; attempts: number; accepted: number }[];
  programs: { id: string; name: string; isPreset: boolean; families: number }[];
  languages: { language: string; users: number }[];
  weekdays: { weekday: number; done: number }[];
}

export interface AppConfig {
  theme: { presetId: string; colors: Record<string, string> } | null;
  content: Partial<Record<Lang, Record<string, string>>>;
  limits: { maxExercisesPerDay: number; maxProgramExercises: number };
  version: string;
}
