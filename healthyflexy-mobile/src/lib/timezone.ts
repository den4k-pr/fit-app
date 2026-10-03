/** IANA-таймзона пристрою (Europe/Warsaw). Надсилається на сервер при кожному запуску. */
export function getDeviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Warsaw';
}
