import { Tabs } from 'expo-router';
import { GuideAutoLauncher } from '@/features/guide/components/GuideAutoLauncher';
import { AppHeader } from '@/navigation/AppHeader';
import { AppTabBar } from '@/navigation/AppTabBar';

/** Вкладки дитини: Дашборд · Прогрес · План · Профіль */
export default function ChildLayout() {
  return (
    <>
      <Tabs
        // Без анімації переходу між вкладками: анімація 'shift' ховала сцену прозорістю й у разі перерваного
        // перемикання (швидкі тапи, повернення з фону) лишала порожній білий екран. Вміст і так з'являється
        // плавно каскадом (shared/motion), а перемикання миттєве.
        screenOptions={{ header: () => <AppHeader />, animation: 'none' }}
        tabBar={(props) => <AppTabBar {...props} />}
      >
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="progress" />
        <Tabs.Screen name="plan" />
        <Tabs.Screen name="programs" />
        <Tabs.Screen name="profile" />
      </Tabs>
      {/* гайд «Як користуватися»: першого разу — сам, далі — з «Профілю» */}
      <GuideAutoLauncher role="child" />
    </>
  );
}
