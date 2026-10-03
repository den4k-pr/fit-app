const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const shortFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

export const fmtDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : '—');
export const fmtDateTime = (iso: string | null | undefined) => (iso ? dateTimeFmt.format(new Date(iso)) : '—');
export const fmtShort = (iso: string) => shortFmt.format(new Date(iso));
export const fmtNum = (n: number) => new Intl.NumberFormat('ru-RU').format(n);
export const fmtMoney = (n: number, currency = 'EUR') =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);

/** «3 дні тому» */
export function fmtAgo(iso: string | null | undefined): string {
  if (!iso) return 'никогда';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days} дн. назад`;
  return fmtDate(iso);
}

export const initials = (name: string | null, fallback: string | null) => {
  if (name?.trim())
    return name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  // без імені: перша літера пошти або останні цифри телефону
  if (fallback && /[a-z]/i.test(fallback[0])) return fallback[0].toUpperCase();
  return fallback ? fallback.replace(/\D/g, '').slice(-2) || '?' : '?';
};

/** Цель упражнения людською мовою */
export function targetText(e: { targetReps: number | null; targetSeconds: number | null; targetSteps: number | null }): string {
  if (e.targetSteps) return `${fmtNum(e.targetSteps)} шагов`;
  if (e.targetReps) return `${e.targetReps} повторений`;
  if (e.targetSeconds) return `${e.targetSeconds} с`;
  return '—';
}

/** Текст контента для отображения в CRM: русский, если заполнен, иначе украинский */
export const ru = (t: { ru?: string; uk: string } | null | undefined): string => (t ? t.ru?.trim() || t.uk : '');
