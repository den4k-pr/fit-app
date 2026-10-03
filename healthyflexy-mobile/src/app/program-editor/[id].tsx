import { ProgramEditorScreen } from '@/features/programs/screens/ProgramEditorScreen';
import { RouteErrorBoundary } from '@/shared/ui/RouteErrorBoundary';

export const ErrorBoundary = RouteErrorBoundary;

export default function ProgramEditorRoute() {
  return <ProgramEditorScreen />;
}
