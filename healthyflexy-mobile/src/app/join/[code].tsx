import { JoinScreen } from '@/features/auth/screens/JoinScreen';
import { RouteErrorBoundary } from '@/shared/ui/RouteErrorBoundary';

export const ErrorBoundary = RouteErrorBoundary;

/** Deep link healthyflexy://join/CODE. TZ §5.5 */
export default function JoinRoute() {
  return <JoinScreen />;
}
