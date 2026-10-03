import type { ReactNode } from 'react';
import type { Palette } from '@/data/palettes';

/** Рамка телефона для живого перегляду екранів застосунку */
export function PhoneFrame({ children, palette, className }: { children: ReactNode; palette: Palette; className?: string }) {
  return (
    <div className={className}>
      <div className="relative mx-auto w-[292px] rounded-[46px] bg-[#0E1411] p-[10px] shadow-[0_30px_60px_-20px_rgba(14,32,22,0.55)]">
        <div className="absolute top-[18px] left-1/2 z-10 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
        <div className="relative h-[600px] overflow-hidden rounded-[36px]" style={{ background: palette.paper, color: palette.ink }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Мініатюра головного екрана «Сьогодні» у вибраній палітрі */
export function TodayScreen({ palette, texts }: { palette: Palette; texts?: Record<string, string> }) {
  const t = (key: string, fallback: string) => texts?.[key] ?? fallback;
  const exercises = [
    { name: 'Приседания у стула', meta: '10 повторений', done: true },
    { name: 'Марш на месте', meta: '45 секунд', done: false },
    { name: 'Дыхание животом', meta: '60 секунд', done: false },
  ];
  return (
    <div className="flex h-full flex-col text-[11px]">
      <div className="px-4 pt-11 pb-5" style={{ background: palette.forest }}>
        <div className="text-[10px] font-semibold" style={{ color: palette.mint }}>
          ☀️ {t('today.greeting.morning', 'Доброе утро, {{name}}').replace('{{name}}', 'Елена')}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl p-2.5" style={{ background: palette.deep }}>
            <div className="text-lg font-extrabold" style={{ color: palette.mint }}>1/3</div>
            <div className="text-[9px] text-white/70">{t('today.ringCaption', 'упражнений')}</div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-[#D4A017] via-[#F0C040] to-[#9C7420] p-2.5 text-white">
            <div className="text-lg font-extrabold">€12.5</div>
            <div className="text-[9px] opacity-85">{t('today.owed', 'К получению: {{amount}}').replace(/[:：].*$/, '')}</div>
          </div>
        </div>
      </div>
      <div className="-mt-3 flex-1 space-y-2 rounded-t-2xl px-3 pt-3" style={{ background: palette.paper }}>
        <div className="rounded-xl border p-2.5 text-[10px] font-semibold" style={{ background: palette.greenLight, borderColor: palette.greenBorder, color: palette.pillGreenText }}>
          {t('today.earnBanner', 'Выполните все упражнения и заработайте {{amount}} сегодня').replace(/<\/?b>/g, '').replace('{{amount}}', '€5')}
        </div>
        <div className="pt-1 text-[10px] font-bold tracking-wide uppercase" style={{ color: palette.muted }}>
          {t('today.exercises', 'Упражнения на сегодня')}
        </div>
        {exercises.map((e) => (
          <div key={e.name} className="flex items-center gap-2 rounded-xl border bg-white p-2.5" style={{ borderColor: palette.border }}>
            <div className="grid size-7 place-items-center rounded-lg text-[12px]" style={{ background: palette.greenLight }}>
              {e.done ? '✓' : '💪'}
            </div>
            <div className="flex-1">
              <div className="font-bold" style={{ color: palette.ink }}>{e.name}</div>
              <div className="text-[9px]" style={{ color: palette.soft }}>{e.meta}</div>
            </div>
            {e.done ? (
              <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: palette.tealBg, color: palette.teal }}>
                ✓
              </span>
            ) : (
              <span className="rounded-lg px-2 py-1 text-[9px] font-bold text-white" style={{ background: palette.greenButton, boxShadow: `0 2px 0 ${palette.greenButtonBase}` }}>
                {t('today.start', 'Старт')}
              </span>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-xl p-2.5" style={{ background: palette.shade, border: `1px solid ${palette.border}` }}>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: palette.border }}>
            <div className="h-full w-1/3 rounded-full" style={{ background: palette.green }} />
          </div>
          <span className="text-[9px] font-bold" style={{ color: palette.muted }}>33%</span>
        </div>
      </div>
      <div className="flex justify-around px-4 pt-2.5 pb-5 text-[9px] font-semibold" style={{ background: palette.forest, color: 'rgba(255,255,255,0.6)' }}>
        <span style={{ color: palette.mint }}>● Сегодня</span>
        <span>Прогресс</span>
        <span>Профиль</span>
      </div>
    </div>
  );
}
