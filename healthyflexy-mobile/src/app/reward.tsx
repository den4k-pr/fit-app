import { RewardScreen } from '@/features/workout/screens/RewardScreen';
import { RouteErrorBoundary } from '@/shared/ui/RouteErrorBoundary';

export const ErrorBoundary = RouteErrorBoundary;

export default function RewardRoute() {
  return <RewardScreen />;
}
