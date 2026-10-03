import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Маршрут без авторизації (OTP, refresh, health) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
