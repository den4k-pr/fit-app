import clsx from 'clsx';
import { Footprints, Plus, Repeat, Search, Timer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { errorMessage } from '@/api/client';
import { useExercises, useSaveExercise } from '@/api/hooks';
import { DumbbellIllustration, EmptyIllustration } from '@/components/illustrations';
import { Badge, Button, Card, Chip, EmptyState, ErrorBox, Input, PageHeader, PageLoader, Toggle, useToast } from '@/components/ui';
import { CATEGORIES, categoryOf } from '@/data/labels';
import { ru, targetText } from '@/lib/format';

export function ExercisesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useExercises();
  const save = useSaveExercise();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(true);

  const list = useMemo(
    () =>
      (data ?? []).filter(
        (e) =>
          (showInactive || e.isActive) &&
          (!category || e.category === category) &&
          (!search.trim() || `${e.name.uk} ${e.name.ru} ${e.name.en} ${e.slug}`.toLowerCase().includes(search.trim().toLowerCase())),
      ),
    [data, search, category, showInactive],
  );

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await save.mutateAsync({ id, body: { isActive } });
      toast(isActive ? 'Упражнение включено' : 'Упражнение выключено — его больше не будет в новых днях');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <>
      <PageHeader
        illustration={<DumbbellIllustration />}
        title="Упражнения"
        subtitle="Базовый каталог упражнений: названия, описание, цель, длительность съемки и критерии для AI-проверки. Выключенное упражнение пропадает из новых дней, но сохраняется в истории."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => navigate('/exercises/new')}>
            Новое упражнение
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск упражнения" className="pl-10" />
        </div>
        <Chip selected={category === null} onClick={() => setCategory(null)}>
          Все
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} selected={category === c.id} onClick={() => setCategory(category === c.id ? null : c.id)}>
            {c.emoji} {c.label}
          </Chip>
        ))}
        <div className="ml-auto">
          <Toggle checked={showInactive} onChange={setShowInactive} label={<span className="text-xs text-soft">Показывать выключенные</span>} />
        </div>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorBox message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState illustration={<EmptyIllustration />} title="Упражнения не найдены" action={<Button onClick={() => navigate('/exercises/new')}>Создать упражнение</Button>} />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((e, i) => {
            const cat = categoryOf(e.category);
            const TargetIcon = e.targetSteps ? Footprints : e.targetReps ? Repeat : Timer;
            return (
              <Card key={e.id} className={clsx('group flex animate-rise flex-col transition hover:-translate-y-0.5 hover:shadow-lift', !e.isActive && 'opacity-60')} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                <Link to={`/exercises/${e.id}`} className="flex flex-1 gap-3.5 p-4">
                  <div className="grid size-14 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: cat.color }}>
                    {cat.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold leading-snug group-hover:text-forest">{ru(e.name)}</h3>
                      {e.managedByAdmin ? <Badge tone="gold">изменено</Badge> : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{ru(e.benefit)}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone="green">
                        <TargetIcon className="size-3" /> {targetText(e)}
                      </Badge>
                      <Badge>{e.durationMin} мин</Badge>
                      <Badge>{cat.label}</Badge>
                      {e.variantGroup ? <Badge tone="dark">↻ {e.variantGroup}</Badge> : null}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center justify-between border-t border-line/70 px-4 py-2.5">
                  <span className="text-[11px] text-muted">
                    {e.usage?.programs ?? 0} программ · {e.usage?.done ?? 0} выполнений
                  </span>
                  <Toggle checked={e.isActive} onChange={(v) => void toggleActive(e.id, v)} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
