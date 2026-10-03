import { PlanScreen } from '@/features/family/screens/PlanScreen';

/** «План» дитини: дні занять, ставка, валюта, час нагадування. PATCH /families/current/plan. TZ §7.2 */
export default function ChildPlanRoute() {
  return <PlanScreen />;
}
