import { activityApi } from './endpoints/activity.api';
import { authApi } from './endpoints/auth.api';
import { exercisesApi } from './endpoints/exercises.api';
import { familiesApi } from './endpoints/families.api';
import { ledgerApi } from './endpoints/ledger.api';
import { paymentsApi } from './endpoints/payments.api';
import { programsApi } from './endpoints/programs.api';
import { usersApi } from './endpoints/users.api';
import { workoutsApi } from './endpoints/workouts.api';

/**
 * ЄДИНА точка входу до сервера для всіх хуків: `api.workouts.getToday()`.
 * Це справжній бекенд (NestJS + PostgreSQL); жодних вбудованих «фальшивих» даних у застосунку немає.
 */
export const api = {
  auth: authApi,
  users: usersApi,
  families: familiesApi,
  exercises: exercisesApi,
  workouts: workoutsApi,
  ledger: ledgerApi,
  programs: programsApi,
  payments: paymentsApi,
  activity: activityApi,
} as const;
