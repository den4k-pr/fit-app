import { ScreenPlaceholder } from '@/shared/ui/ScreenPlaceholder';

/** Невідомий маршрут / битий deep link → на головний екран за роллю */
export default function NotFoundScreen() {
  return <ScreenPlaceholder route="+not-found" spec="TZ v3.0 " />;
}
