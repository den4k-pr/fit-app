/** E.164: + і 7–15 цифр, перша цифра не 0 */
export const E164_REGEX = /^\+[1-9]\d{6,14}$/;

/** Час у форматі HH:mm (24 години) */
export const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Код запрошення: 6 символів без 0 O 1 I L */
export const INVITE_CODE_REGEX = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

/** OTP-код: рівно 6 цифр */
export const OTP_CODE_REGEX = /^\d{6}$/;

/** Місяць календаря: YYYY-MM */
export const YEAR_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Expo push token */
export const EXPO_PUSH_TOKEN_REGEX = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;
