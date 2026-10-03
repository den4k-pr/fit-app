import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toIsoDate } from '@/lib/iso-date';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import type { LedgerEntry } from '@/types';
import { EarnDetailSheet } from './EarnDetailSheet';
import { LedgerItem } from './LedgerItem';

export interface LedgerListProps {
  entries: LedgerEntry[];
  /** Показати лише перші N записів (дашборд) */
  limit?: number;
}

/** Білий блок із журналом розрахунків. Нові записи першими; порожній стан — підказка. */
export function LedgerList({ entries, limit }: LedgerListProps) {
  const { t } = useTranslation();
  const visible = limit ? entries.slice(0, limit) : entries;
  const today = toIsoDate(new Date());
  const [opened, setOpened] = useState<LedgerEntry | null>(null);

  if (visible.length === 0) {
    return (
      <Card>
        <EmptyState title={t('ledger.empty.title')} description={t('ledger.empty.body')} />
      </Card>
    );
  }
  return (
    <>
      <Card flush>
        {visible.map((entry, index) => (
          <LedgerItem key={entry.id} entry={entry} today={today} index={index} isLast={index === visible.length - 1} onPress={setOpened} />
        ))}
      </Card>
      <EarnDetailSheet entry={opened} onClose={() => setOpened(null)} />
    </>
  );
}
