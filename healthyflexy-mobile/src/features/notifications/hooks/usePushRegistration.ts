/** Дозвіл на сповіщення → getExpoPushTokenAsync → PUT /users/me/push-token; оновлення токена при зміні. */
export function usePushRegistration(): {
  permissionGranted: boolean | null;
  register: () => Promise<void>;
} {
  throw new Error('Not implemented: usePushRegistration');
}
