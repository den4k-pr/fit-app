import { ProgressScreen } from '@/features/history/screens/ProgressScreen';
import { UserRole } from '@/types';

/** «Прогрес» батька/матері: показники, календар, журнал, підтвердження переказів, нагадування. TZ §6.4 */
export default function ParentHistoryRoute() {
  return <ProgressScreen role={UserRole.Parent} />;
}
