import { CalendarDays, ListChecks, Save } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/api/client';
import { useAppConfig, useSaveAppConfig } from '@/api/hooks';
import type { AppConfig } from '@/api/types';
import { IconBlob, LimitsIllustration } from '@/components/illustrations';
import { Button, Card, ErrorBox, PageHeader, PageLoader, useToast } from '@/components/ui';

export function LimitsPage() {
  const { data, isLoading, error, refetch } = useAppConfig();
  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorBox message={errorMessage(error)} onRetry={() => void refetch()} />;
  return <LimitsEditor key={data.version} saved={data.limits} />;
}

function LimitsEditor({ saved }: { saved: AppConfig['limits'] }) {
  const toast = useToast();
  const save = useSaveAppConfig();
  const [limits, setLimits] = useState(saved);
  const dirty = JSON.stringify(limits) !== JSON.stringify(saved);

  const submit = async () => {
    try {
      await save.mutateAsync({ limits });
      toast('Лимиты сохранены');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <>
      <PageHeader
        illustration={<LimitsIllustration />}
        title="Лимиты упражнений"
        subtitle="Сколько упражнений максимум получает человек — и в готовых программах, и когда ребенок собирает программу вручную."
        actions={
          <Button icon={<Save className="size-4" />} disabled={!dirty} loading={save.isPending} onClick={() => void submit()}>
            Сохранить
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <LimitCard
          icon={<CalendarDays className="size-6" />}
          title="Упражнений в день"
          text="Даже если в программе на этот день больше упражнений, родители получат не больше этого количества (первые по порядку). Действует со следующего дня."
          value={limits.maxExercisesPerDay}
          min={1}
          max={30}
          onChange={(v) => setLimits((l) => ({ ...l, maxExercisesPerDay: v }))}
        />
        <LimitCard
          icon={<ListChecks className="size-6" />}
          title="Упражнений в программе"
          text="Сколько упражнений можно добавить в одну программу — в CRM и в приложении, когда ребенок составляет программу сам. Уже сохраненные программы не меняются."
          value={limits.maxProgramExercises}
          min={1}
          max={40}
          onChange={(v) => setLimits((l) => ({ ...l, maxProgramExercises: v }))}
        />
      </div>
    </>
  );
}

function LimitCard({ icon, title, text, value, min, max, onChange }: { icon: React.ReactNode; title: string; text: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <IconBlob>{icon}</IconBlob>
        <div className="flex-1">
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-5">
        <button className="grid size-11 place-items-center rounded-xl border border-line text-xl font-bold text-forest hover:bg-green-light disabled:opacity-40" disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <div className="flex-1 text-center">
          <div className="text-5xl font-extrabold text-forest tabular-nums">{value}</div>
          <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-3 w-full" />
          <div className="flex justify-between text-[11px] text-muted">
            <span>{min}</span>
            <span>{max}</span>
          </div>
        </div>
        <button className="grid size-11 place-items-center rounded-xl border border-line text-xl font-bold text-forest hover:bg-green-light disabled:opacity-40" disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {Array.from({ length: Math.min(value, 20) }).map((_, i) => (
          <span key={i} className="size-3 animate-pop rounded-full bg-green" style={{ animationDelay: `${i * 15}ms` }} />
        ))}
        {value > 20 ? <span className="text-xs text-muted">+{value - 20}</span> : null}
      </div>
    </Card>
  );
}
