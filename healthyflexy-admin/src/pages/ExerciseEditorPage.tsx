import clsx from 'clsx';
import { ArrowLeft, Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { errorMessage } from '@/api/client';
import { useDeleteExercise, useExercise, useExercises, useSaveExercise } from '@/api/hooks';
import type { BodyImpact, Exercise, LocalizedInput } from '@/api/types';
import { emptyLocalized, LocalizedField, toLocalizedInput } from '@/components/LocalizedField';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Chip,
  ConfirmDialog,
  ErrorBox,
  Field,
  Input,
  NumberInput,
  PageLoader,
  Segmented,
  Select,
  Textarea,
  Toggle,
  useToast,
} from '@/components/ui';
import { BODY_IMPACT, CATEGORIES, categoryOf, VOICE_PATTERNS, WORKOUT_TYPES } from '@/data/labels';
import { targetText } from '@/lib/format';

type TargetKind = 'reps' | 'seconds' | 'steps';

interface Form {
  slug: string;
  category: string;
  name: LocalizedInput;
  benefit: LocalizedInput;
  description: LocalizedInput;
  safetyInstructions: LocalizedInput;
  aiCriteria: string;
  targetKind: TargetKind;
  target: number | null;
  recordMaxSec: number | null;
  workoutTypes: string[];
  durationMin: number | null;
  bodyImpactOn: boolean;
  bodyImpact: BodyImpact;
  muscles: LocalizedInput[];
  demoVideoUrl: string;
  sourceTitle: string;
  sourceUrl: string;
  sortOrder: number | null;
  isActive: boolean;
  variantGroup: string;
  voicePattern: string;
}

const EMPTY: Form = {
  slug: '',
  category: 'strength',
  name: emptyLocalized(),
  benefit: emptyLocalized(),
  description: emptyLocalized(),
  safetyInstructions: emptyLocalized(),
  aiCriteria: '',
  targetKind: 'reps',
  target: 10,
  recordMaxSec: 30,
  workoutTypes: ['strength'],
  durationMin: 3,
  bodyImpactOn: true,
  bodyImpact: { muscles: 60, heart: 30, brain: 20, bones: 40, energy: 40 },
  muscles: [],
  demoVideoUrl: '',
  sourceTitle: '',
  sourceUrl: '',
  sortOrder: 100,
  isActive: true,
  variantGroup: '',
  voicePattern: '',
};

function formOf(e: Exercise): Form {
  const targetKind: TargetKind = e.targetSteps ? 'steps' : e.targetReps ? 'reps' : 'seconds';
  return {
    slug: e.slug,
    category: e.category,
    name: toLocalizedInput(e.name),
    benefit: toLocalizedInput(e.benefit),
    description: toLocalizedInput(e.description),
    safetyInstructions: toLocalizedInput(e.safetyInstructions),
    aiCriteria: e.aiCriteria ?? '',
    targetKind,
    target: targetKind === 'steps' ? e.targetSteps : targetKind === 'reps' ? e.targetReps : e.targetSeconds,
    recordMaxSec: e.recordMaxSec,
    workoutTypes: e.workoutTypes,
    durationMin: e.durationMin,
    bodyImpactOn: !!e.bodyImpact,
    bodyImpact: e.bodyImpact ?? EMPTY.bodyImpact,
    muscles: (e.muscles ?? []).map(toLocalizedInput),
    demoVideoUrl: e.demoVideoUrl ?? '',
    sourceTitle: e.sourceTitle ?? '',
    sourceUrl: e.sourceUrl ?? '',
    sortOrder: e.sortOrder,
    isActive: e.isActive,
    variantGroup: e.variantGroup ?? '',
    voicePattern: e.voicePattern ?? '',
  };
}

const TABS = [
  { id: 'main', label: 'Основное' },
  { id: 'texts', label: 'Описание и безопасность' },
  { id: 'target', label: 'Цель и съемка' },
  { id: 'body', label: 'Влияние на тело' },
  { id: 'ai', label: 'AI и источник' },
] as const;
type Tab = (typeof TABS)[number]['id'];

const optionalText = (t: LocalizedInput) => (t.uk.trim() ? t : null);

export function ExerciseEditorPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const { data, isLoading, error } = useExercise(isNew ? undefined : id);
  if (!isNew && isLoading) return <PageLoader />;
  if (!isNew && (error || !data)) return <ErrorBox message={errorMessage(error)} />;
  return <Editor key={data?.id ?? 'new'} exercise={isNew ? null : data!} />;
}

function Editor({ exercise }: { exercise: Exercise | null }) {
  const navigate = useNavigate();
  const toast = useToast();
  const save = useSaveExercise();
  const remove = useDeleteExercise();
  const [form, setForm] = useState<Form>(() => (exercise ? formOf(exercise) : EMPTY));
  const [tab, setTab] = useState<Tab>('main');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const problems: string[] = [];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug)) problems.push('Ключ: латиница, цифры, дефис (напр. chair-squat)');
  if (!form.name.uk.trim()) problems.push('Название на украинском');
  if (!form.benefit.uk.trim()) problems.push('Польза на украинском');
  if (!form.target) problems.push('Цель упражнения');
  if (!form.recordMaxSec || form.recordMaxSec < 5 || form.recordMaxSec > 120) problems.push('Съемка: 5–120 с');
  if (!form.durationMin) problems.push('Длительность, мин');
  if (form.variantGroup && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.variantGroup)) problems.push('Группа: латиница, цифры, дефис');

  const submit = async () => {
    const body = {
      slug: form.slug,
      category: form.category,
      name: form.name,
      benefit: form.benefit,
      description: optionalText(form.description),
      safetyInstructions: optionalText(form.safetyInstructions),
      aiCriteria: form.aiCriteria.trim() || null,
      targetReps: form.targetKind === 'reps' ? form.target : null,
      targetSeconds: form.targetKind === 'seconds' ? form.target : null,
      targetSteps: form.targetKind === 'steps' ? form.target : null,
      recordMaxSec: form.recordMaxSec,
      workoutTypes: form.workoutTypes,
      durationMin: form.durationMin,
      bodyImpact: form.bodyImpactOn ? form.bodyImpact : null,
      muscles: form.muscles.filter((m) => m.uk.trim()),
      demoVideoUrl: form.demoVideoUrl.trim() || null,
      sourceTitle: form.sourceTitle.trim() || null,
      sourceUrl: form.sourceUrl.trim() || null,
      sortOrder: form.sortOrder ?? 100,
      isActive: form.isActive,
      variantGroup: form.variantGroup.trim() || null,
      voicePattern: form.voicePattern || null,
    };
    try {
      const saved = await save.mutateAsync({ id: exercise?.id, body });
      toast(exercise ? 'Изменения сохранены' : 'Упражнение создано');
      if (!exercise) navigate(`/exercises/${saved.id}`, { replace: true });
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const doDelete = async () => {
    if (!exercise) return;
    try {
      const res = await remove.mutateAsync(exercise.id);
      toast(res.deleted ? 'Упражнение удалено' : 'Упражнение уже выполняли — оно выключено, история сохранена');
      navigate('/exercises');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const cat = categoryOf(form.category);
  const preview = {
    targetReps: form.targetKind === 'reps' ? form.target : null,
    targetSeconds: form.targetKind === 'seconds' ? form.target : null,
    targetSteps: form.targetKind === 'steps' ? form.target : null,
  };

  return (
    <>
      <Link to="/exercises" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-soft hover:text-forest">
        <ArrowLeft className="size-4" /> Все упражнения
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl text-2xl" style={{ background: cat.color }}>
            {cat.emoji}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">{form.name.ru?.trim() || form.name.uk || 'Новое упражнение'}</h1>
            <p className="text-xs text-muted">{exercise ? `Ключ: ${exercise.slug}` : 'Заполните поля и нажмите «Сохранить»'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {exercise ? (
            <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
              Удалить
            </Button>
          ) : null}
          <Button icon={<Save className="size-4" />} loading={save.isPending} disabled={problems.length > 0} onClick={() => void submit()} title={problems.join('\n')}>
            Сохранить
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div>
          <Segmented value={tab} onChange={setTab} options={[...TABS]} className="mb-4 flex-wrap" />
          <Card className="animate-rise p-5" key={tab}>
            {tab === 'main' ? (
              <div className="space-y-5">
                <LocalizedField label="Название" required value={form.name} onChange={(v) => set('name', v)} placeholder="Приседания у стула" maxLength={100} />
                <LocalizedField label="Польза (коротко, видно на карточке упражнения)" required value={form.benefit} onChange={(v) => set('benefit', v)} placeholder="Укрепляет ноги и помогает легче вставать" multiline />
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-soft">Категория (определяет иконку)</span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => set('category', c.id)}
                        className={clsx('flex items-center gap-2.5 rounded-xl border-2 p-2.5 text-left text-sm font-semibold transition', form.category === c.id ? 'border-green bg-green-light' : 'border-line hover:border-green-border')}
                      >
                        <span className="grid size-8 place-items-center rounded-lg text-lg" style={{ background: c.color }}>
                          {c.emoji}
                        </span>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Технический ключ" hint="Латиница и дефис. По нему приложение находит анимацию упражнения" className="sm:col-span-2">
                    <Input value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="chair-squat" maxLength={50} />
                  </Field>
                  <Field label="Порядок в каталоге" hint="Меньше число — выше">
                    <NumberInput value={form.sortOrder} onChange={(v) => set('sortOrder', v)} min={0} max={10000} />
                  </Field>
                </div>
                <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} label="Упражнение активно (попадает в новые дни тренировок)" />
              </div>
            ) : null}

            {tab === 'texts' ? (
              <div className="space-y-5">
                <LocalizedField label="Как выполнять" value={form.description} onChange={(v) => set('description', v)} multiline placeholder="Сядьте на край стула, ноги на ширине плеч…" />
                <LocalizedField label="Безопасность (показывается перед стартом)" value={form.safetyInstructions} onChange={(v) => set('safetyInstructions', v)} multiline placeholder="Держитесь за спинку стула, если кружится голова" />
              </div>
            ) : null}

            {tab === 'target' ? (
              <div className="space-y-5">
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-soft">Что считаем</span>
                  <Segmented
                    value={form.targetKind}
                    onChange={(v) => setForm((f) => ({ ...f, targetKind: v, target: v === 'steps' ? 1000 : v === 'reps' ? 10 : 30 }))}
                    options={[
                      { id: 'reps', label: 'Повторения' },
                      { id: 'seconds', label: 'Секунды' },
                      { id: 'steps', label: 'Шаги (шагомер)' },
                    ]}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Цель" hint={form.targetKind === 'steps' ? 'Шаги считает телефон, фото не делаются' : 'Базовая цель; программа может ее изменить'}>
                    <NumberInput value={form.target} onChange={(v) => set('target', v)} min={1} suffix={{ reps: 'раз', seconds: 'с', steps: 'шагов' }[form.targetKind]} />
                  </Field>
                  <Field label="Съемка упражнения" hint="5–120 с; кадры из этого промежутка проверяет AI">
                    <NumberInput value={form.recordMaxSec} onChange={(v) => set('recordMaxSec', v)} min={5} max={120} suffix="с" />
                  </Field>
                  <Field label="Длительность в плане" hint="Для бюджета «Время тренировки»">
                    <NumberInput value={form.durationMin} onChange={(v) => set('durationMin', v)} min={1} max={60} suffix="мин" />
                  </Field>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-soft">Виды нагрузки (фильтр «План → Виды нагрузки»)</span>
                  <div className="flex flex-wrap gap-2">
                    {WORKOUT_TYPES.map((w) => (
                      <Chip
                        key={w.id}
                        selected={form.workoutTypes.includes(w.id)}
                        onClick={() => set('workoutTypes', form.workoutTypes.includes(w.id) ? form.workoutTypes.filter((x) => x !== w.id) : [...form.workoutTypes, w.id])}
                      >
                        {w.label}
                      </Chip>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted">Ничего не выбрано — упражнение входит в день всегда.</p>
                </div>
                <VarietyFields form={form} set={set} currentId={exercise?.id} />
              </div>
            ) : null}

            {tab === 'body' ? (
              <div className="space-y-5">
                <Toggle checked={form.bodyImpactOn} onChange={(v) => set('bodyImpactOn', v)} label="Показывать карточку «Влияние на организм»" />
                {form.bodyImpactOn ? (
                  <div className="space-y-3">
                    {BODY_IMPACT.map((b) => (
                      <div key={b.id} className="flex items-center gap-4">
                        <span className="w-20 text-sm font-semibold">{b.label}</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={form.bodyImpact[b.id]}
                          onChange={(e) => set('bodyImpact', { ...form.bodyImpact, [b.id]: Number(e.target.value) })}
                          className="flex-1"
                          style={{ accentColor: b.color }}
                        />
                        <span className="w-10 text-right text-sm font-bold tabular-nums" style={{ color: b.color }}>
                          {form.bodyImpact[b.id]}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-soft">Задействованные мышцы</span>
                    <Button variant="secondary" size="sm" icon={<Plus className="size-3.5" />} onClick={() => set('muscles', [...form.muscles, emptyLocalized()])} disabled={form.muscles.length >= 10}>
                      Добавить
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {form.muscles.map((m, i) => (
                      <div key={i} className="flex items-end gap-2">
                        <div className="flex-1">
                          <LocalizedField label={`Мышца ${i + 1}`} value={m} onChange={(v) => set('muscles', form.muscles.map((x, k) => (k === i ? v : x)))} maxLength={100} />
                        </div>
                        <Button variant="ghost" size="md" onClick={() => set('muscles', form.muscles.filter((_, k) => k !== i))} icon={<X className="size-4" />} aria-label="Убрать" />
                      </div>
                    ))}
                    {form.muscles.length === 0 ? <p className="text-xs text-muted">Пока не добавлено</p> : null}
                  </div>
                </div>
              </div>
            ) : null}

            {tab === 'ai' ? (
              <div className="space-y-5">
                <Field label="Как выглядит правильное выполнение (для AI, на английском)" hint="AI смотрит на само движение, а не на предметы вокруг. Опишите, что именно должно двигаться и как.">
                  <Textarea value={form.aiCriteria} onChange={(e) => set('aiCriteria', e.target.value)} rows={6} maxLength={2000} placeholder="The person repeatedly lowers the hips toward a seat and stands back up; knees bend and straighten each repetition…" />
                </Field>
                <Field label="Демо-видео (URL)">
                  <Input value={form.demoVideoUrl} onChange={(e) => set('demoVideoUrl', e.target.value)} placeholder="https://…" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Источник (название)">
                    <Input value={form.sourceTitle} onChange={(e) => set('sourceTitle', e.target.value)} placeholder="NHS: Sitting exercises" />
                  </Field>
                  <Field label="Источник (ссылка)">
                    <Input value={form.sourceUrl} onChange={(e) => set('sourceUrl', e.target.value)} placeholder="https://…" />
                  </Field>
                </div>
              </div>
            ) : null}
          </Card>
          {problems.length > 0 ? (
            <div className="mt-3 rounded-xl bg-gold-soft px-4 py-3 text-xs text-[#633806]">
              <b>Чтобы сохранить, заполните:</b> {problems.join(' · ')}
            </div>
          ) : null}
        </div>

        {/* як вправа виглядатиме в застосунку */}
        <div className="xl:sticky xl:top-8 xl:self-start">
          <Card>
            <CardHeader title="Так это увидят в приложении" />
            <div className="space-y-3 bg-paper p-4">
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
                <div className="grid size-11 place-items-center rounded-xl text-xl" style={{ background: cat.color }}>
                  {cat.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{form.name.ru?.trim() || form.name.uk || 'Название упражнения'}</div>
                  <div className="text-xs text-soft">{targetText(preview)}</div>
                </div>
                <span className="rounded-lg bg-green-button px-2.5 py-1.5 text-[11px] font-bold text-white shadow-[0_2px_0_#1F8350]">Старт</span>
              </div>
              <div className="rounded-2xl border border-green-border bg-green-light p-3 text-xs">
                <b className="text-forest">⚡ Польза:</b> <span className="text-soft">{form.benefit.ru?.trim() || form.benefit.uk || '—'}</span>
              </div>
              {form.bodyImpactOn ? (
                <div className="rounded-2xl border border-line bg-white p-3">
                  <div className="mb-2 text-[10px] font-bold tracking-wide text-muted uppercase">Влияние на организм</div>
                  {BODY_IMPACT.map((b) => (
                    <div key={b.id} className="mb-1.5 flex items-center gap-2 text-[11px]">
                      <span className="w-14 text-soft">{b.label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-shade">
                        <div className="h-full rounded-full transition-all" style={{ width: `${form.bodyImpact[b.id]}%`, background: b.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {form.safetyInstructions.uk ? (
                <div className="rounded-2xl border border-[#EDD9A3] bg-gold-soft p-3 text-xs text-[#633806]">⚠️ {form.safetyInstructions.ru?.trim() || form.safetyInstructions.uk}</div>
              ) : null}
              <div className="flex flex-wrap gap-1">
                {form.workoutTypes.map((w) => (
                  <Badge key={w}>{WORKOUT_TYPES.find((x) => x.id === w)?.label ?? w}</Badge>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Удалить упражнение?"
        text="Если упражнение уже кто-то выполнял или оно есть в программах, его только выключат — история пользователей не пострадает."
        confirmLabel="Удалить"
        danger
        loading={remove.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void doDelete()}
      />
    </>
  );
}

/** Группа разновидностей и ритм голосового помощника */
function VarietyFields({
  form,
  set,
  currentId,
}: {
  form: Form;
  set: <K extends keyof Form>(key: K, value: Form[K]) => void;
  currentId?: string;
}) {
  const catalog = useExercises().data ?? [];
  const groups = [...new Set(catalog.map((e) => e.variantGroup).filter((g): g is string => !!g))].sort();
  const siblings = form.variantGroup ? catalog.filter((e) => e.variantGroup === form.variantGroup && e.id !== currentId) : [];
  const voice = VOICE_PATTERNS.find((v) => v.id === form.voicePattern);
  return (
    <div className="grid gap-4 rounded-2xl border border-line bg-shade p-4 sm:grid-cols-2">
      <Field
        label="Группа разновидностей"
        hint="Упражнения одной группы чередуются день за днем на том же месте программы (например, «squat»: приседания → сумо → с подъемом на носки)."
      >
        <Input
          list="variant-groups"
          value={form.variantGroup}
          onChange={(e) => set('variantGroup', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          placeholder="без группы"
          maxLength={40}
        />
        <datalist id="variant-groups">
          {groups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
        {siblings.length > 0 ? (
          <span className="mt-1.5 block text-xs text-soft">
            Чередуется с: {siblings.map((e) => e.name.ru || e.name.uk).join(', ')}
          </span>
        ) : null}
      </Field>
      <Field label="Голосовой помощник" hint={voice ? `Проговаривает: ${voice.example}` : 'По категории упражнения'}>
        <Select value={form.voicePattern} onChange={(e) => set('voicePattern', e.target.value)}>
          <option value="">По категории</option>
          {VOICE_PATTERNS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
