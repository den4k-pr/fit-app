import clsx from 'clsx';
import { RotateCcw, Save, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { errorMessage } from '@/api/client';
import { useAppConfig, useSaveAppConfig } from '@/api/hooks';
import type { AppConfig } from '@/api/types';
import { TextsIllustration } from '@/components/illustrations';
import { PhoneFrame } from '@/components/PhoneMockup';
import { ScreenPreview } from '@/components/ScreenPreview';
import { Badge, Button, Card, ErrorBox, PageHeader, PageLoader, Segmented, Textarea, useToast } from '@/components/ui';
import { DEFAULT_PALETTE, type Palette } from '@/data/palettes';
import { DEFAULT_TEXTS, keysOf, labelOf, LANGS, SCREEN_SECTIONS, type Lang } from '@/data/screens';

type Content = Record<Lang, Record<string, string>>;

const normalize = (c: AppConfig['content']): Content => ({ uk: { ...c.uk }, ru: { ...c.ru }, pl: { ...c.pl }, en: { ...c.en } });

/** Порожні поля (людина стерла текст і ще не ввела новий) не публікуються — це стандартний текст */
const withoutEmpty = (c: Content): Content =>
  Object.fromEntries(Object.entries(c).map(([l, texts]) => [l, Object.fromEntries(Object.entries(texts).filter(([, v]) => v.trim()))])) as Content;

export function TextsPage() {
  const { data, isLoading, error, refetch } = useAppConfig();
  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorBox message={errorMessage(error)} onRetry={() => void refetch()} />;
  const palette = { ...DEFAULT_PALETTE, ...(data.theme?.colors ?? {}) } as Palette;
  return <TextsEditor key={data.version} saved={normalize(data.content)} palette={palette} />;
}

function TextsEditor({ saved, palette }: { saved: Content; palette: Palette }) {
  const toast = useToast();
  const save = useSaveAppConfig();
  const [content, setContent] = useState<Content>(saved);
  const [lang, setLang] = useState<Lang>('ru');
  const [sectionId, setSectionId] = useState(SCREEN_SECTIONS[0].id);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const section = SCREEN_SECTIONS.find((s) => s.id === sectionId)!;
  const keys = useMemo(() => keysOf(section), [section]);
  const dirty = JSON.stringify(withoutEmpty(content)) !== JSON.stringify(saved);

  const effective = useMemo(() => ({ ...DEFAULT_TEXTS[lang], ...withoutEmpty(content)[lang] }), [content, lang]);
  const changedIn = (s: (typeof SCREEN_SECTIONS)[number]) => keysOf(s).filter((k) => LANGS.some((l) => content[l.id][k]?.trim())).length;

  const setText = (key: string, value: string) =>
    setContent((c) => {
      const next = { ...c[lang] };
      if (value === DEFAULT_TEXTS[lang][key]) delete next[key];
      else next[key] = value;
      return { ...c, [lang]: next };
    });

  const submit = async () => {
    try {
      await save.mutateAsync({ content: withoutEmpty(content) });
      toast('Тексты опубликованы — приложение обновит их при следующем запуске');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <>
      <PageHeader
        illustration={<TextsIllustration />}
        title="Тексты и онбординг"
        subtitle="Меняйте, что написано на экранах приложения, — отдельно для каждого языка. Измененные поля отмечены; ↺ возвращает стандартный текст."
        actions={
          <>
            <Button variant="ghost" icon={<Undo2 className="size-4" />} disabled={!dirty} onClick={() => setContent(saved)}>
              Отмена
            </Button>
            <Button icon={<Save className="size-4" />} disabled={!dirty} loading={save.isPending} onClick={() => void submit()}>
              Опубликовать
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[230px_1fr] xl:grid-cols-[230px_1fr_310px]">
        <nav className="space-y-1 lg:sticky lg:top-8 lg:self-start">
          <div className="mb-2 px-2 text-[10px] font-bold tracking-[0.12em] text-muted uppercase">Экраны</div>
          {SCREEN_SECTIONS.map((s, i) => {
            const changed = changedIn(s);
            return (
              <button
                key={s.id}
                onClick={() => {
                  setSectionId(s.id);
                  setFocusKey(null);
                }}
                className={clsx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition', sectionId === s.id ? 'bg-white text-forest shadow-card ring-1 ring-line' : 'text-soft hover:bg-white/70')}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-green-light text-base">{s.emoji}</span>
                <span className="flex-1">
                  {i < 7 ? <span className="mr-1 text-[10px] text-muted">{i + 1}.</span> : null}
                  {s.title}
                </span>
                {changed ? <span className="grid size-5 place-items-center rounded-full bg-gold text-[10px] font-bold text-white">{changed}</span> : null}
              </button>
            );
          })}
        </nav>

        <Card className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h3 className="text-base font-bold">
                {section.emoji} {section.title}
              </h3>
              <p className="text-xs text-muted">{section.description}</p>
            </div>
            <Segmented value={lang} onChange={setLang} options={LANGS.map((l) => ({ id: l.id, label: `${l.flag} ${l.id.toUpperCase()}` }))} />
          </div>
          <div className="divide-y divide-line/60">
            {keys.map((key) => {
              const override = content[lang][key];
              const def = DEFAULT_TEXTS[lang][key] ?? '';
              return (
                <div key={key} className={clsx('px-5 py-3.5 transition', focusKey === key && 'bg-green-light/40')}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-xs font-bold text-soft">{labelOf(key, section)}</span>
                    {override?.trim() ? <Badge tone="gold">изменено</Badge> : override !== undefined ? <Badge>будет стандартный</Badge> : null}
                    <span className="ml-auto font-mono text-[10px] text-muted/70">{key}</span>
                    {override !== undefined ? (
                      <button className="rounded-md p-1 text-muted hover:bg-shade hover:text-forest" title="Вернуть стандартный текст" onClick={() => setText(key, def)}>
                        <RotateCcw className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <Textarea
                    rows={def.length > 70 ? 3 : 1}
                    value={override ?? def}
                    placeholder="Пусто — будет стандартный текст"
                    onFocus={() => setFocusKey(key)}
                    onChange={(e) => setText(key, e.target.value)}
                  />
                  {/\{\{\w+\}\}/.test(def) ? (
                    <p className="mt-1 text-[11px] text-muted">
                      Оставьте переменные как есть: {[...new Set(def.match(/\{\{\w+\}\}/g))].join(', ')}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="hidden xl:sticky xl:top-8 xl:block xl:self-start">
          <div className="mb-3 text-center text-xs font-semibold text-muted">Как это будет выглядеть</div>
          <PhoneFrame palette={palette}>
            <ScreenPreview section={section} texts={effective} palette={palette} focusKey={focusKey} />
          </PhoneFrame>
        </div>
      </div>
    </>
  );
}
