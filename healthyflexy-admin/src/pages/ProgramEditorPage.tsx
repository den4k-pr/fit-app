import clsx from 'clsx';
import { Archive, ArchiveRestore, ArrowDown, ArrowLeft, ArrowUp, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { errorMessage } from '@/api/client';
import { useAppConfig, useExercises, useProgram, useProgramMutations } from '@/api/hooks';
import type { Exercise, LocalizedInput, Program } from '@/api/types';
import { emptyLocalized, LocalizedField, toLocalizedInput } from '@/components/LocalizedField';
import { Badge, Button, Card, CardHeader, ConfirmDialog, ErrorBox, Field, Input, Modal, NumberInput, PageLoader, Segmented, useToast } from '@/components/ui';
import { categoryOf, WEEKDAYS } from '@/data/labels';
import { ru, targetText } from '@/lib/format';

interface Row {
  exerciseId: string;
  target: number | null;
  planDays: number[];
}

interface Form {
  slug: string;
  name: LocalizedInput;
  description: LocalizedInput;
  highlights: LocalizedInput[];
  durationType: 'week' | 'month';
  rows: Row[];
}

const targetKindOf = (e: Pick<Exercise, 'targetReps' | 'targetSeconds' | 'targetSteps'>) =>
  e.targetSteps ? 'targetSteps' : e.targetReps ? 'targetReps' : 'targetSeconds';

function formOf(p: Program): Form {
  return {
    slug: p.slug ?? '',
    name: toLocalizedInput(p.name),
    description: toLocalizedInput(p.description),
    highlights: p.highlights.map(toLocalizedInput),
    durationType: p.durationType,
    rows: p.exercises.map((e) => {
      const kind = targetKindOf(e.defaults);
      return { exerciseId: e.exerciseId, target: e[kind] ?? e.defaults[kind], planDays: e.planDays };
    }),
  };
}

export function ProgramEditorPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const program = useProgram(isNew ? undefined : id);
  const exercises = useExercises();
  if ((!isNew && program.isLoading) || exercises.isLoading) return <PageLoader />;
  if ((!isNew && (program.error || !program.data)) || exercises.error) return <ErrorBox message={errorMessage(program.error ?? exercises.error)} />;
  return <Editor key={program.data?.id ?? 'new'} program={isNew ? null : program.data!} catalog={exercises.data ?? []} />;
}

function Editor({ program, catalog }: { program: Program | null; catalog: Exercise[] }) {
  const navigate = useNavigate();
  const toast = useToast();
  const m = useProgramMutations();
  const limit = useAppConfig().data?.limits.maxProgramExercises ?? 20;
  const [form, setForm] = useState<Form>(() =>
    program ? formOf(program) : { slug: '', name: emptyLocalized(), description: emptyLocalized(), highlights: [], durationType: 'week', rows: [] },
  );
  const [picker, setPicker] = useState(false);
  const [confirm, setConfirm] = useState<'delete' | null>(null);
  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog]);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setRow = (i: number, patch: Partial<Row>) => set('rows', form.rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  const problems: string[] = [];
  if (!form.name.uk.trim()) problems.push('Название на украинском');
  if (form.rows.length === 0) problems.push('Хотя бы одно упражнение');
  if (form.rows.length > limit) problems.push(`Не больше ${limit} упражнений (лимит)`);
  if (form.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug)) problems.push('Ключ: латиница, цифры, дефис');

  const submit = async () => {
    const body = {
      slug: form.slug || null,
      name: form.name,
      description: form.description.uk.trim() ? form.description : null,
      highlights: form.highlights.filter((h) => h.uk.trim()),
      durationType: form.durationType,
      exercises: form.rows.map((r) => {
        const ex = byId.get(r.exerciseId);
        const kind = ex ? targetKindOf(ex) : 'targetReps';
        const base = ex?.[kind] ?? null;
        return { exerciseId: r.exerciseId, planDays: r.planDays, [kind]: r.target && r.target !== base ? r.target : null };
      }),
    };
    try {
      const saved = await m.save.mutateAsync({ id: program?.id, body });
      toast(program ? 'Программа сохранена' : 'Программа создана');
      if (!program) navigate(`/programs/${saved.id}`, { replace: true });
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const archive = async (archived: boolean) => {
    if (!program) return;
    try {
      await m.archive.mutateAsync({ id: program.id, archived });
      toast(archived ? 'Программа скрыта из каталога' : 'Программа возвращена в каталог');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const doDelete = async () => {
    if (!program) return;
    try {
      const res = await m.remove.mutateAsync(program.id);
      toast(res.deleted ? 'Программа удалена' : 'Программой уже пользовались — она перенесена в архив');
      navigate('/programs');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const minutes = form.rows.reduce((sum, r) => sum + (byId.get(r.exerciseId)?.durationMin ?? 0), 0);

  return (
    <>
      <Link to="/programs" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-soft hover:text-forest">
        <ArrowLeft className="size-4" /> Все программы
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold">{form.name.ru?.trim() || form.name.uk || 'Новая программа'}</h1>
            {program?.archivedAt ? <Badge tone="gold">в архиве</Badge> : null}
          </div>
          <p className="text-xs text-muted">
            {form.rows.length} из {limit} упражнений · ≈ {minutes} мин на полный день
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {program ? (
            <>
              <Button variant="secondary" icon={program.archivedAt ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />} onClick={() => void archive(!program.archivedAt)} loading={m.archive.isPending}>
                {program.archivedAt ? 'Вернуть в каталог' : 'В архив'}
              </Button>
              <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirm('delete')}>
                Удалить
              </Button>
            </>
          ) : null}
          <Button icon={<Save className="size-4" />} loading={m.save.isPending} disabled={problems.length > 0} onClick={() => void submit()}>
            Сохранить
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card className="self-start p-5">
          <div className="space-y-5">
            <LocalizedField label="Название" required value={form.name} onChange={(v) => set('name', v)} maxLength={100} placeholder="Мягкий старт" />
            <LocalizedField label="Описание" value={form.description} onChange={(v) => set('description', v)} multiline placeholder="Легкие упражнения для первых недель" />
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-soft">Длительность</span>
              <Segmented value={form.durationType} onChange={(v) => set('durationType', v)} options={[{ id: 'week', label: 'Неделя' }, { id: 'month', label: 'Месяц' }]} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-soft">Преимущества (пункты на экране программы)</span>
                <Button variant="secondary" size="sm" icon={<Plus className="size-3.5" />} disabled={form.highlights.length >= 8} onClick={() => set('highlights', [...form.highlights, emptyLocalized()])}>
                  Добавить
                </Button>
              </div>
              <div className="space-y-3">
                {form.highlights.map((h, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="flex-1">
                      <LocalizedField label={`Пункт ${i + 1}`} value={h} onChange={(v) => set('highlights', form.highlights.map((x, k) => (k === i ? v : x)))} maxLength={200} />
                    </div>
                    <Button variant="ghost" icon={<X className="size-4" />} onClick={() => set('highlights', form.highlights.filter((_, k) => k !== i))} aria-label="Убрать" />
                  </div>
                ))}
              </div>
            </div>
            <Field label="Технический ключ (необязательно)" hint="Латиница и дефис">
              <Input value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="gentle-start" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Состав программы"
            subtitle="Порядок = порядок выполнения. Цель можно изменить для этой программы, дни — когда упражнение попадает в план."
            action={
              <Button size="sm" icon={<Plus className="size-4" />} disabled={form.rows.length >= limit} onClick={() => setPicker(true)}>
                Добавить упражнения
              </Button>
            }
          />
          <div className="divide-y divide-line/70">
            {form.rows.length === 0 ? <p className="px-5 py-12 text-center text-sm text-muted">Добавьте упражнения из каталога</p> : null}
            {form.rows.map((r, i) => {
              const ex = byId.get(r.exerciseId);
              if (!ex) return null;
              const cat = categoryOf(ex.category);
              const kind = targetKindOf(ex);
              return (
                <div key={r.exerciseId} className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <button className="rounded p-0.5 text-muted hover:bg-shade hover:text-forest disabled:opacity-30" disabled={i === 0} onClick={() => set('rows', swap(form.rows, i, i - 1))} aria-label="Выше">
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button className="rounded p-0.5 text-muted hover:bg-shade hover:text-forest disabled:opacity-30" disabled={i === form.rows.length - 1} onClick={() => set('rows', swap(form.rows, i, i + 1))} aria-label="Ниже">
                        <ArrowDown className="size-3.5" />
                      </button>
                    </div>
                    <span className="w-5 text-xs font-bold text-muted">{i + 1}</span>
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl text-lg" style={{ background: cat.color }}>
                      {cat.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{ru(ex.name)}</div>
                      <div className="text-xs text-muted">
                        Базово: {targetText(ex)}
                        {!ex.isActive ? ' · выключено' : ''}
                        {ex.variantGroup ? ` · ↻ чередуется с группой «${ex.variantGroup}»` : ''}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" icon={<X className="size-4" />} onClick={() => set('rows', form.rows.filter((_, k) => k !== i))} aria-label="Убрать" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 pl-[76px]">
                    <NumberInput value={r.target} onChange={(v) => setRow(i, { target: v })} min={1} className="w-28" suffix={{ targetReps: 'раз', targetSeconds: 'с', targetSteps: 'шаг.' }[kind]} />
                    <div className="flex gap-1">
                      {WEEKDAYS.map((d, k) => {
                        const on = r.planDays.includes(k + 1);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              const next = on ? r.planDays.filter((x) => x !== k + 1) : [...r.planDays, k + 1].sort();
                              if (next.length) setRow(i, { planDays: next });
                            }}
                            className={clsx('size-8 rounded-lg text-[10px] font-bold transition', on ? 'bg-green text-white' : 'bg-shade text-muted hover:bg-green-light')}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {problems.length > 0 ? <div className="border-t border-line bg-gold-soft px-5 py-3 text-xs text-[#633806]">Чтобы сохранить: {problems.join(' · ')}</div> : null}
        </Card>
      </div>

      <ExercisePicker
        open={picker}
        catalog={catalog}
        selected={form.rows.map((r) => r.exerciseId)}
        limit={limit}
        onClose={() => setPicker(false)}
        onToggle={(ex) =>
          setForm((f) => ({
            ...f,
            rows: f.rows.some((r) => r.exerciseId === ex.id)
              ? f.rows.filter((r) => r.exerciseId !== ex.id)
              : f.rows.length >= limit
                ? f.rows
                : [...f.rows, { exerciseId: ex.id, target: ex[targetKindOf(ex)], planDays: [1, 2, 3, 4, 5, 6, 7] }],
          }))
        }
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        title="Удалить программу?"
        text="Если программу уже назначали семьям, она будет перенесена в архив — те, кто занимается, продолжат без изменений."
        confirmLabel="Удалить"
        danger
        loading={m.remove.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => void doDelete()}
      />
    </>
  );
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

function ExercisePicker({
  open,
  catalog,
  selected,
  limit,
  onClose,
  onToggle,
}: {
  open: boolean;
  catalog: Exercise[];
  selected: string[];
  limit: number;
  onClose: () => void;
  onToggle: (e: Exercise) => void;
}) {
  const [search, setSearch] = useState('');
  const full = selected.length >= limit;
  const list = catalog.filter((e) => e.isActive && (!search.trim() || `${ru(e.name)} ${e.name.ru}`.toLowerCase().includes(search.trim().toLowerCase())));
  return (
    <Modal open={open} onClose={onClose} title="Каталог упражнений" wide footer={<Button onClick={onClose}>Готово</Button>}>
      <div className="mb-3 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск" className="pl-10" autoFocus />
        </div>
        <Badge tone={full ? 'red' : 'green'}>
          {selected.length} / {limit}
        </Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((e) => {
          const on = selected.includes(e.id);
          const cat = categoryOf(e.category);
          return (
            <button
              key={e.id}
              type="button"
              disabled={!on && full}
              onClick={() => onToggle(e)}
              className={clsx('flex items-center gap-3 rounded-xl border-2 p-2.5 text-left transition disabled:opacity-40', on ? 'border-green bg-green-light' : 'border-line hover:border-green-border')}
            >
              <span className="grid size-9 place-items-center rounded-lg text-lg" style={{ background: cat.color }}>
                {cat.emoji}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{ru(e.name)}</div>
                <div className="text-xs text-muted">{targetText(e)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
