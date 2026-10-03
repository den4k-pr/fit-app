import clsx from 'clsx';
import { AlertTriangle, Check, RotateCcw, Save, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { errorMessage } from '@/api/client';
import { useAppConfig, useSaveAppConfig } from '@/api/hooks';
import { PaletteIllustration } from '@/components/illustrations';
import { PhoneFrame, TodayScreen } from '@/components/PhoneMockup';
import { Button, Card, CardHeader, ErrorBox, PageHeader, PageLoader, Segmented, useToast } from '@/components/ui';
import { DEFAULT_PALETTE, PRESETS, THEME_KEYS, TOKEN_INFO, type Palette, type ThemeKey } from '@/data/palettes';
import { contrast, derivePalette, isHex, paletteOfPreset } from '@/lib/color';

export function DesignPage() {
  const { data, isLoading, error, refetch } = useAppConfig();
  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorBox message={errorMessage(error)} onRetry={() => void refetch()} />;
  const saved: Palette = { ...DEFAULT_PALETTE, ...(data.theme?.colors ?? {}) } as Palette;
  return <DesignEditor key={data.version} savedPalette={saved} savedPreset={data.theme?.presetId ?? 'forest'} />;
}

function DesignEditor({ savedPalette, savedPreset }: { savedPalette: Palette; savedPreset: string }) {
  const toast = useToast();
  const save = useSaveAppConfig();
  const [palette, setPalette] = useState<Palette>(savedPalette);
  const [presetId, setPresetId] = useState(savedPreset);
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const dirty = JSON.stringify(palette) !== JSON.stringify(savedPalette) || presetId !== savedPreset;

  const choosePreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id)!;
    setPresetId(id);
    setPalette(paletteOfPreset(preset));
  };
  const setBase = (dark: string, accent: string) => {
    setPresetId('custom');
    setPalette(derivePalette(dark, accent));
  };
  const setToken = (key: ThemeKey, value: string) => {
    setPresetId('custom');
    setPalette((p) => ({ ...p, [key]: value.toUpperCase() }));
  };

  const warnings = useMemo(() => {
    const out: string[] = [];
    if (contrast(palette.greenButton, '#FFFFFF') < 3) out.push('Белый текст на главной кнопке плохо читается — сделайте кнопку темнее.');
    if (contrast(palette.ink, palette.paper) < 7) out.push('Основной текст недостаточно контрастен к фону — людям 60+ будет трудно читать.');
    if (contrast(palette.mint, palette.forest) < 3) out.push('Числа на темных плитках сливаются с фоном.');
    if (contrast(palette.muted, '#FFFFFF') < 2.5) out.push('Приглушенный текст слишком светлый.');
    return out;
  }, [palette]);

  const submit = async () => {
    try {
      const isDefault = presetId === 'forest' && JSON.stringify(palette) === JSON.stringify(DEFAULT_PALETTE);
      await save.mutateAsync({ theme: isDefault ? null : { presetId, colors: palette } });
      toast('Палитра сохранена. Приложение подхватит ее при следующем запуске');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <>
      <PageHeader
        illustration={<PaletteIllustration />}
        title="Дизайн и цвета"
        subtitle="Выберите готовую палитру или создайте свою. Изменения приходят в приложение с сервера — выпускать новую версию не нужно."
        actions={
          <>
            <Button variant="ghost" icon={<RotateCcw className="size-4" />} disabled={!dirty} onClick={() => { setPalette(savedPalette); setPresetId(savedPreset); }}>
              Отмена
            </Button>
            <Button icon={<Save className="size-4" />} disabled={!dirty} loading={save.isPending} onClick={() => void submit()}>
              Опубликовать
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Готовые палитры" subtitle="Один клик — и все приложение в новых цветах" icon={<Sparkles className="size-4" />} />
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {PRESETS.map((p) => {
                const pal = paletteOfPreset(p);
                const active = presetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => choosePreset(p.id)}
                    className={clsx('group relative overflow-hidden rounded-2xl border-2 text-left transition hover:-translate-y-0.5', active ? 'border-green shadow-lift' : 'border-line hover:border-green-border')}
                  >
                    <div className="flex h-16" style={{ background: pal.forest }}>
                      <div className="flex flex-1 items-end gap-1.5 p-2.5">
                        <span className="h-5 w-10 rounded-md" style={{ background: pal.greenButton }} />
                        <span className="size-5 rounded-full" style={{ background: pal.mint }} />
                        <span className="size-5 rounded-full" style={{ background: pal.green }} />
                      </div>
                    </div>
                    <div className="flex h-5" style={{ background: pal.paper }}>
                      <span className="w-1/3" style={{ background: pal.greenLight }} />
                      <span className="w-1/3" style={{ background: pal.border }} />
                    </div>
                    <div className="bg-white px-3 py-2.5">
                      <div className="text-sm font-bold">{p.name}</div>
                      <div className="text-[11px] text-muted">{p.description}</div>
                    </div>
                    {active ? (
                      <span className="absolute top-2 right-2 grid size-6 animate-pop place-items-center rounded-full bg-white text-green shadow">
                        <Check className="size-4" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Своя палитра"
              subtitle={mode === 'simple' ? 'Два цвета — остальные оттенки подберем автоматически' : 'Каждый цвет отдельно — для точной настройки'}
              action={<Segmented value={mode} onChange={setMode} options={[{ id: 'simple', label: 'Просто' }, { id: 'advanced', label: 'Подробно' }]} />}
            />
            {mode === 'simple' ? (
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <BigColor label="Основной темный" hint="Шапка, нижнее меню, плитки" value={palette.forest} onChange={(v) => setBase(v, palette.green)} />
                <BigColor label="Акцент" hint="Кнопки, прогресс, галочки" value={palette.green} onChange={(v) => setBase(palette.forest, v)} />
              </div>
            ) : (
              <div className="grid gap-x-6 gap-y-3 p-5 md:grid-cols-2">
                {THEME_KEYS.map((key) => (
                  <ColorRow key={key} tokenKey={key} value={palette[key]} onChange={(v) => setToken(key, v)} />
                ))}
              </div>
            )}
          </Card>

          {warnings.length > 0 ? (
            <div className="space-y-2 rounded-2xl border border-[#EDD9A3] bg-gold-soft p-4">
              {warnings.map((w) => (
                <div key={w} className="flex gap-2 text-sm text-[#633806]">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {w}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="xl:sticky xl:top-8 xl:self-start">
          <div className="mb-3 text-center text-xs font-semibold text-muted">Предпросмотр</div>
          <PhoneFrame palette={palette}>
            <TodayScreen palette={palette} />
          </PhoneFrame>
          <p className="mt-4 text-center text-xs text-muted">Пользователи увидят новые цвета при следующем запуске приложения.</p>
        </div>
      </div>
    </>
  );
}

function BigColor({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setText(value);
  }
  return (
    <label className="flex items-center gap-4 rounded-2xl border border-line p-3 transition hover:border-green-border">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="size-16 cursor-pointer rounded-xl" />
      <div className="flex-1">
        <div className="text-sm font-bold">{label}</div>
        <div className="text-xs text-muted">{hint}</div>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (isHex(e.target.value)) onChange(e.target.value.toUpperCase());
          }}
          className="mt-1.5 w-24 rounded-md border border-line px-2 py-0.5 font-mono text-xs uppercase outline-none focus:border-green"
        />
      </div>
    </label>
  );
}

function ColorRow({ tokenKey, value, onChange }: { tokenKey: ThemeKey; value: string; onChange: (v: string) => void }) {
  const info = TOKEN_INFO[tokenKey];
  return (
    <label className="flex items-center gap-3">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-9 shrink-0 cursor-pointer rounded-lg ring-1 ring-line" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{info.label}</div>
        <div className="truncate text-[11px] text-muted">{info.hint}</div>
      </div>
      <span className="font-mono text-[11px] text-soft">{value}</span>
    </label>
  );
}
