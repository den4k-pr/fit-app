import { Tabs } from 'expo-router';
import { GuideAutoLauncher } from '@/features/guide/components/GuideAutoLauncher';
import { AppHeader } from '@/navigation/AppHeader';
import { AppTabBar } from '@/navigation/AppTabBar';

/** Вкладки батька/матері: Сьогодні · Прогрес · Профіль (макет: нижня навігація, верхня смуга з назвою) */
export default function ParentLayout() {
  return (
    <>
      <Tabs
        // Без анімації переходу між вкладками: анімація 'shift' ховала сцену прозорістю й у разі перерваного
        // перемикання (швидкі тапи, повернення з фону) лишала порожній білий екран. Вміст і так з'являється
        // плавно каскадом (shared/motion), а перемикання миттєве.
        screenOptions={{ header: () => <AppHeader />, animation: 'none' }}
        tabBar={(props) => <AppTabBar {...props} />}
      >
        <Tabs.Screen name="today" />
        <Tabs.Screen name="history" />
        <Tabs.Screen name="account" />
      </Tabs>
      {/* гайд «Як користуватися»: першого разу — сам, далі — з «Профілю» */}
      <GuideAutoLauncher role="parent" />
    </>
  );
}
