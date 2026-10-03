/** Параметри динамічних маршрутів Expo Router (значення приходять рядками). */
export interface ExerciseRouteParams {
  exerciseId: string;
  /** ?sessionId=... — день, у межах якого виконується вправа */
  sessionId?: string;
}
export interface ClipRouteParams {
  recordId: string;
}
export interface JoinRouteParams {
  /** код із deep link healthyflexy://join/ABC234 */
  code: string;
}
export interface OtpRouteParams {
  phone: string;
  /** скільки секунд лишилось до повторної відправки (з відповіді request) */
  retryAfterSeconds?: string;
}
export interface InviteRouteParams {
  /** true → відкрито одразу після реєстрації дитини (крок 1 онбордингу дитини) */
  firstRun?: string;
}
