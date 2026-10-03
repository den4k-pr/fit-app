import { PhotosScreen } from '@/features/dashboard/screens/PhotosScreen';
import { RouteErrorBoundary } from '@/shared/ui/RouteErrorBoundary';

export const ErrorBoundary = RouteErrorBoundary;

/** Кадри вправи (лише дитина): GET /workouts/records/:id/photos. TZ §7.4 */
export default function PhotosRoute() {
  return <PhotosScreen />;
}
