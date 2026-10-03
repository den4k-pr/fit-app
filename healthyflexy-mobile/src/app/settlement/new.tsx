import { NewSettlementScreen } from '@/features/ledger/screens/NewSettlementScreen';
import { RouteErrorBoundary } from '@/shared/ui/RouteErrorBoundary';

export const ErrorBoundary = RouteErrorBoundary;

/** «Переказ зроблено»: сума ≤ owed − pending → POST /ledger/settlements. TZ §8.5 */
export default function NewSettlementRoute() {
  return <NewSettlementScreen />;
}
