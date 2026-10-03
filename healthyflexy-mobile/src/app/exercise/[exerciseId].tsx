import { ExerciseScreen } from '@/features/workout/screens/ExerciseScreen';
import { RouteErrorBoundary } from '@/shared/ui/RouteErrorBoundary';

export const ErrorBoundary = RouteErrorBoundary;

/** Екран вправи: демо → запис → результат. TZ §6.3 */
export default function ExerciseRoute() {
  return <ExerciseScreen />;
}
