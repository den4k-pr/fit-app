import { useTranslation } from 'react-i18next';
import { AppTopBar } from '@/shared/components/AppTopBar';
import { ServerStatus } from '@/shared/components/ServerStatus';

/** Верхня смуга всіх екранів усередині застосунку: назва застосунку */
export function AppHeader() {
  const { t } = useTranslation();
  return (
    <>
      <AppTopBar title={t('app.name')} />
      <ServerStatus />
    </>
  );
}
