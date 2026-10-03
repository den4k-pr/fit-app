import { z } from 'zod';
import { PROFILE } from '@/constants/limits';

/** Схеми форм (react-hook-form + zodResolver). Повідомлення — ключі i18n. */
export const phoneSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'auth.phone.invalid'),
});
export type PhoneFormValues = z.infer<typeof phoneSchema>;

export const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'errors.OTP_INVALID'),
});
export type OtpFormValues = z.infer<typeof otpSchema>;

export const profileSetupSchema = z.object({
  name: z.string().trim().min(1, 'errors.VALIDATION_FAILED').max(PROFILE.NAME_MAX),
  age: z.number().int().min(PROFILE.AGE_MIN).max(PROFILE.AGE_MAX).optional(),
});
export type ProfileSetupFormValues = z.infer<typeof profileSetupSchema>;

export const inviteCodeSchema = z.object({
  code: z
    .string()
    .transform((v) => v.replace(/\s/g, '').toUpperCase())
    .pipe(z.string().regex(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/, 'errors.INVITE_INVALID')),
});
export type InviteCodeFormValues = z.input<typeof inviteCodeSchema>;
