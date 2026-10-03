import { Redirect } from 'expo-router';
import { useAuthRedirect } from '@/features/auth/hooks/useAuthRedirect';
import { LoadingView } from '@/shared/ui/LoadingView';

/** Точка входу `/`: вирішує, куди вести за станом авторизації та роллю */
export default function IndexScreen() {
  const target = useAuthRedirect();
  if (!target) return <LoadingView />;
  return <Redirect href={target} />;
}
