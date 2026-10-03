import clsx from 'clsx';
import { DEFAULT_PALETTE, type Palette } from '@/data/palettes';
import { keysOf, type ScreenSection } from '@/data/screens';
import { TodayScreen } from './PhoneMockup';

/** Підставляє приклади замість {{змінних}} і прибирає розмітку */
const sample = (text: string) =>
  text
    .replace(/<\/?b>/g, '')
    .replace(/\{\{(\w+)\}\}/g, (_, v: string) => ({ name: 'Елена', amount: '€5', phone: '+48 501 234 567', email: 'olena@mail.com', seconds: '30', count: '3', date: '12 окт.', code: 'K7M2QX', day: 'Пн', done: '1', total: '3' })[v] ?? '…');

interface Props {
  section: ScreenSection;
  texts: Record<string, string>;
  palette?: Palette;
  focusKey?: string | null;
}

export function ScreenPreview({ section, texts, palette = DEFAULT_PALETTE, focusKey }: Props) {
  const t = (key: string) => sample(texts[key] ?? '');
  const hl = (key: string) => (focusKey === key ? 'rounded-md bg-[#F0C040]/35 ring-2 ring-[#F0C040]' : '');
  const btn = (key: string, secondary = false) => (
    <div
      className={clsx('rounded-xl py-2.5 text-center text-[11px] font-bold', hl(key))}
      style={secondary ? { color: palette.soft } : { background: palette.greenButton, color: '#fff', boxShadow: `0 3px 0 ${palette.greenButtonBase}` }}
    >
      {t(key)}
    </div>
  );

  if (section.preview === 'today') return <TodayScreen palette={palette} texts={texts} />;

  if (section.preview === 'slides') {
    const slide = /slide(\d)/.exec(focusKey ?? '')?.[1] ?? '1';
    const art = ['🏡', '🏃‍♀️', '💚', '📈'][Number(slide) - 1] ?? '🏡';
    return (
      <div className="flex h-full flex-col" style={{ background: palette.forest }}>
        <div className="flex justify-end px-5 pt-12">
          <span className={clsx('text-[11px] font-semibold', hl('onboarding.skip'))} style={{ color: palette.mint }}>
            {t('onboarding.skip')}
          </span>
        </div>
        <div className="grid flex-1 place-items-center">
          <div className="grid size-36 place-items-center rounded-full text-6xl" style={{ background: palette.deep }}>
            {art}
          </div>
        </div>
        <div className="rounded-t-[28px] bg-white px-6 pt-6 pb-8">
          <div className={clsx('text-lg leading-tight font-extrabold', hl(`onboarding.slide${slide}.title`))} style={{ color: palette.ink }}>
            {t(`onboarding.slide${slide}.title`)}
          </div>
          <div className={clsx('mt-2 text-[12px] leading-relaxed', hl(`onboarding.slide${slide}.body`))} style={{ color: palette.soft }}>
            {t(`onboarding.slide${slide}.body`)}
          </div>
          <div className="my-4 flex justify-center gap-1.5">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className="h-1.5 rounded-full transition-all" style={{ width: String(n) === slide ? 18 : 6, background: String(n) === slide ? palette.green : palette.border }} />
            ))}
          </div>
          {btn('onboarding.start')}
        </div>
      </div>
    );
  }

  if (section.preview === 'consent') {
    return (
      <div className="flex h-full flex-col px-5 pt-12 pb-6">
        <div className={clsx('text-lg font-extrabold', hl('consent.title'))} style={{ color: palette.ink }}>
          {t('consent.title')}
        </div>
        <p className={clsx('mt-2 text-[11px] leading-relaxed', hl('consent.intro'))} style={{ color: palette.soft }}>
          {t('consent.intro')}
        </p>
        <div className={clsx('mt-3 rounded-xl p-2.5 text-[10px]', hl('consent.notMedical'))} style={{ background: '#FDF4E3', color: '#633806' }}>
          ⚠️ {t('consent.notMedical')}
        </div>
        <div className="mt-3 space-y-2">
          {['consent.termsLabel', 'consent.disclaimerLabel', 'consent.doctorLabel'].map((k) => (
            <div key={k} className={clsx('flex gap-2 rounded-xl border bg-white p-2.5 text-[10px]', hl(k))} style={{ borderColor: palette.border, color: palette.ink }}>
              <span className="grid size-4 shrink-0 place-items-center rounded text-[9px] text-white" style={{ background: palette.green }}>
                ✓
              </span>
              {t(k)}
            </div>
          ))}
        </div>
        <div className="flex-1" />
        {btn('consent.accept')}
        <p className={clsx('mt-2 text-center text-[9px]', hl('consent.footer'))} style={{ color: palette.muted }}>
          {t('consent.footer')}
        </p>
      </div>
    );
  }

  if (section.preview === 'role') {
    return (
      <div className="flex h-full flex-col px-5 pt-14 pb-6">
        <div className={clsx('text-xl font-extrabold', hl('auth.role.title'))} style={{ color: palette.ink }}>
          {t('auth.role.title')}
        </div>
        {(['parent', 'child'] as const).map((r, i) => (
          <div key={r} className="mt-4 flex items-center gap-3 rounded-2xl border-2 bg-white p-3.5" style={{ borderColor: i === 0 ? palette.green : palette.border, background: i === 0 ? palette.greenLight : '#fff' }}>
            <span className="text-3xl">{r === 'parent' ? '👵' : '🧑'}</span>
            <div>
              <div className={clsx('text-[13px] font-bold', hl(`auth.role.${r}`))} style={{ color: palette.ink }}>
                {t(`auth.role.${r}`)}
              </div>
              <div className={clsx('text-[10px]', hl(`auth.role.${r}Hint`))} style={{ color: palette.soft }}>
                {t(`auth.role.${r}Hint`)}
              </div>
            </div>
          </div>
        ))}
        <p className={clsx('mt-4 text-center text-[10px]', hl('auth.role.warning'))} style={{ color: palette.muted }}>
          {t('auth.role.warning')}
        </p>
      </div>
    );
  }

  if (section.preview === 'reward') {
    return (
      <div className="flex h-full flex-col items-center px-6 pt-16 pb-6 text-center" style={{ background: palette.forest }}>
        <div className="text-6xl">🏆</div>
        <div className={clsx('mt-4 text-xl font-extrabold text-white', hl('reward.dayDone'))}>{t('reward.dayDone')}</div>
        <div className="mt-3 text-4xl font-extrabold" style={{ color: palette.mint }}>
          +€5
        </div>
        <div className={clsx('text-[11px] text-white/70', hl('reward.credited'))}>{t('reward.credited')}</div>
        <div className={clsx('mt-5 w-full rounded-2xl bg-white/10 p-3 text-[11px] text-white', hl('reward.total'))}>{t('reward.total')}</div>
        <div className={clsx('mt-3 text-[11px]', hl('reward.streakLine'))} style={{ color: palette.mint }}>
          🔥 {t('reward.streakLine')}
        </div>
      </div>
    );
  }

  // загальний вигляд: заголовок + решта текстів картками
  const keys = keysOf(section);
  const title = keys.find((k) => k.endsWith('.title')) ?? keys[0];
  const rest = keys.filter((k) => k !== title).slice(0, 9);
  const isButton = (k: string) => /\.(send|submit|verify|next|create|share|login|enterCode|start|accept)$/.test(k);
  return (
    <div className="flex h-full flex-col px-5 pt-12 pb-6">
      <div className={clsx('text-lg leading-tight font-extrabold', hl(title))} style={{ color: palette.ink }}>
        {t(title)}
      </div>
      <div className="mt-3 flex-1 space-y-2 overflow-hidden">
        {rest.map((k) =>
          isButton(k) ? (
            <div key={k}>{btn(k)}</div>
          ) : (
            <div key={k} className={clsx('rounded-xl border bg-white p-2.5 text-[10px] leading-relaxed', hl(k))} style={{ borderColor: palette.border, color: palette.soft }}>
              {t(k)}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
