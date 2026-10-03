import { Redirect, useRouter } from 'expo-router';
import { useEffect } from 'react';

/**
 * Посилання повернення в застосунок (BLIK / PayPal / 3-D Secure — `healthyflexy://stripe-redirect`;
 * налаштування виплат у Stripe — `healthyflexy://payouts`). Сам платіж обробляють Stripe SDK і сервер,
 * тут лише повертаємося туди, де людина була, замість екрана «не знайдено».
 */
export default function ReturnLinkRoute() {
  const router = useRouter();
  const canGoBack = router.canGoBack();
  useEffect(() => {
    if (canGoBack) router.back();
  }, [canGoBack, router]);
  return canGoBack ? null : <Redirect href="/" />;
}
