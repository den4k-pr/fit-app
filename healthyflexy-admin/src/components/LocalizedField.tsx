import clsx from 'clsx';
import { useState } from 'react';
import type { LocalizedInput } from '@/api/types';
import { LANGS, type Lang } from '@/data/screens';
import { Input, Textarea } from './ui';

/**
 * Текст чотирма мовами з вкладками. Обовʼязкова лише українська: якщо іншу мову не заповнено,
 * застосунок покаже український текст (про це нагадує підказка в полі).
 */
export function LocalizedField({
  label,
  value,
  onChange,
  multiline,
  required,
  placeholder,
  maxLength = 2000,
}: {
  label: string;
  value: LocalizedInput;
  onChange: (v: LocalizedInput) => void;
  multiline?: boolean;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  // русская вкладка по умолчанию; украинская — если она еще пуста (она обязательна)
  const [lang, setLang] = useState<Lang>(() => (value.uk.trim() ? 'ru' : 'uk'));
  const current = value[lang] ?? '';
  const Control = multiline ? Textarea : Input;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-soft">
          {label}
          {required ? <span className="text-red"> *</span> : null}
          {required && lang !== 'uk' && !value.uk.trim() ? <span className="ml-1 font-medium text-red">(заполните UK)</span> : null}
        </span>
        <div className="flex gap-0.5 rounded-lg bg-shade p-0.5 ring-1 ring-line">
          {LANGS.map((l) => {
            const filled = !!value[l.id]?.trim();
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setLang(l.id)}
                className={clsx(
                  'relative rounded-md px-2 py-0.5 text-[11px] font-bold uppercase transition',
                  lang === l.id ? 'bg-white text-forest shadow-card' : 'text-muted hover:text-forest',
                )}
                title={l.label}
              >
                {l.id}
                {filled ? <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-green" /> : null}
              </button>
            );
          })}
        </div>
      </div>
      <Control
        value={current}
        maxLength={maxLength}
        placeholder={lang === 'uk' ? placeholder : value.uk ? `Пусто → «${value.uk.slice(0, 60)}»` : 'Пусто → на украинском'}
        onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
      />
    </div>
  );
}

export const emptyLocalized = (): LocalizedInput => ({ uk: '', ru: '', pl: '', en: '' });
export const toLocalizedInput = (t: Partial<Record<Lang, string>> | null | undefined): LocalizedInput => ({
  uk: t?.uk ?? '',
  ru: t?.ru && t.ru !== t.uk ? t.ru : '',
  pl: t?.pl && t.pl !== t.uk ? t.pl : '',
  en: t?.en && t.en !== t.uk ? t.en : '',
});
export const isFilled = (t: LocalizedInput) => !!t.uk.trim();
