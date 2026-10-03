import { ProgressScreen } from '@/features/history/screens/ProgressScreen';
import { UserRole } from '@/types';

/** «Прогрес» дитини: показники, календар місяця, журнал розрахунків (лише перегляд). TZ §7.1 */
export default function ChildProgressRoute() {
  return <ProgressScreen role={UserRole.Child} />;
}
