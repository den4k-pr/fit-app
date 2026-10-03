import clsx from 'clsx';
import { Archive, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { errorMessage } from '@/api/client';
import { usePrograms } from '@/api/hooks';
import { CalendarIllustration, EmptyIllustration } from '@/components/illustrations';
import { Badge, Button, Card, EmptyState, ErrorBox, PageHeader, PageLoader, Toggle } from '@/components/ui';
import { categoryOf } from '@/data/labels';
import { ru } from '@/lib/format';

export function ProgramsPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = usePrograms();
  const [showArchived, setShowArchived] = useState(false);
  const list = (data ?? []).filter((p) => showArchived || !p.archivedAt);

  return (
    <>
      <PageHeader
        illustration={<CalendarIllustration />}
        title="Программы"
        subtitle="Базовый пакет — готовые программы, из которых ребенок выбирает план для родителей. Задайте состав, цели и дни недели для каждого упражнения."
        actions={
          <>
            <Toggle checked={showArchived} onChange={setShowArchived} label={<span className="text-xs text-soft">Архив</span>} />
            <Button icon={<Plus className="size-4" />} onClick={() => navigate('/programs/new')}>
              Новая программа
            </Button>
          </>
        }
      />
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorBox message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState illustration={<EmptyIllustration />} title="Программ пока нет" action={<Button onClick={() => navigate('/programs/new')}>Создать программу</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p, i) => (
            <Link key={p.id} to={`/programs/${p.id}`} className={clsx('group animate-rise', p.archivedAt && 'opacity-60')} style={{ animationDelay: `${i * 40}ms` }}>
              <Card className="flex h-full flex-col overflow-hidden transition group-hover:-translate-y-0.5 group-hover:shadow-lift">
                <div className="relative bg-gradient-to-br from-forest to-deep px-5 pt-5 pb-4 text-white">
                  <div className="absolute -top-8 -right-8 size-28 rounded-full bg-white/5" />
                  <div className="flex items-center gap-2">
                    <Badge tone="dark" className="border-mint/30 bg-white/10 text-mint">
                      {p.durationType === 'week' ? 'Неделя' : 'Месяц'}
                    </Badge>
                    {p.archivedAt ? (
                      <Badge tone="gold">
                        <Archive className="size-3" /> в архиве
                      </Badge>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-lg leading-snug font-extrabold">{ru(p.name)}</h3>
                  {p.description ? <p className="mt-1 line-clamp-2 text-xs text-mint/80">{ru(p.description)}</p> : null}
                </div>
                <div className="flex-1 space-y-1.5 p-4">
                  {p.exercises.slice(0, 4).map((e) => (
                    <div key={e.exerciseId} className="flex items-center gap-2 text-sm">
                      <span className="grid size-6 place-items-center rounded-md text-xs" style={{ background: categoryOf(e.category).color }}>
                        {categoryOf(e.category).emoji}
                      </span>
                      <span className="truncate">{ru(e.name)}</span>
                    </div>
                  ))}
                  {p.exercises.length > 4 ? <div className="pl-8 text-xs text-muted">еще {p.exercises.length - 4}…</div> : null}
                </div>
                <div className="flex items-center justify-between border-t border-line/70 px-4 py-2.5 text-xs text-muted">
                  <span>{p.exercises.length} упражнений</span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" /> {p.families ?? 0} семей сейчас
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
