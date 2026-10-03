/** POST /families/current/reminders */
export class ReminderResponseDto {
  sentAt: Date;

  /** sentAt + 2 години */
  nextAllowedAt: Date;
}
