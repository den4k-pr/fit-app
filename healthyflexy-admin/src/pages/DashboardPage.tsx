import { Activity, BookOpen, Brain, CalendarCheck, Dumbbell, HandCoins, Sparkles, Users } from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { errorMessage } from '@/api/client';
import { useAnalytics } from '@/api/hooks';
import { Badge, Card, CardHeader, ErrorBox, PageHeader, PageLoader, Segmented, StatTile } from '@/components/ui';
import { categoryOf, LANG_LABEL, WEEKDAYS } from '@/data/labels';
import { fmtMoney, fmtNum, fmtShort } from '@/lib/format';

const PERIODS = [
  { id: '7', label: '7 дней' },
  { id: '30', label: '30 дней' },
  { id: '90', label: '90 дней' },
] as const;

const PIE_COLORS = ['#17593A', '#33B26E', '#BDF2D2', '#C9962B'];
const tooltipStyle = { borderRadius: 12, border: '1px solid #DCEBE1', fontFamily: 'Montserrat', fontSize: 12 };

export function DashboardPage() {
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');
  const { data, isLoading, error, refetch } = useAnalytics(Number(period));

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorBox message={errorMessage(error)} onRetry={() => void refetch()} />;
  const t = data.totals;
  const series = data.series.map((s) => ({ ...s, label: fmtShort(s.date), aiRate: s.aiAttempts ? Math.round((s.aiAccepted / s.aiAttempts) * 100) : null }));
  const roles = [
    { name: 'Родители', value: t.parents },
    { name: 'Дети', value: t.children },
    { name: 'Без роли', value: t.noRole },
  ].filter((r) => r.value > 0);

  return (
    <>
      <PageHeader
        title="Обзор"
        subtitle="Как живет приложение: кто приходит, кто занимается и как работает AI-проверка упражнений."
        actions={<Segmented value={period} onChange={setPeriod} options={[...PERIODS]} />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile tone="forest" label="Пользователей" value={fmtNum(t.users)} icon={<Users className="size-5" />} hint={`+${t.newUsers} за период`} />
        <StatTile label="Активны за неделю" value={fmtNum(t.activeWeek)} icon={<Activity className="size-5" />} hint={`${t.activeFamiliesWeek} семей занимались`} />
        <StatTile label="Выполнение дней" value={`${t.completionRate}%`} icon={<CalendarCheck className="size-5" />} hint={`${fmtNum(t.completedDays)} дней выполнено всего`} />
        <StatTile tone="gold" label="Начислено родителям" value={fmtMoney(t.earned)} icon={<HandCoins className="size-5" />} hint={`${fmtMoney(t.settled)} выплачено`} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Семей" value={fmtNum(t.families)} icon={<Sparkles className="size-5" />} />
        <StatTile label="Упражнений выполнено" value={fmtNum(t.exercisesDone)} icon={<Dumbbell className="size-5" />} />
        <StatTile label="AI принимает" value={`${t.aiAcceptRate}%`} icon={<Brain className="size-5" />} hint={`${fmtNum(t.aiAttempts)} проверок, ср. балл ${t.aiAvgScore}`} />
        <StatTile label="Каталог" value={`${t.activeExercises} / ${t.presets}`} icon={<BookOpen className="size-5" />} hint={`активных упражнений / программ · ${t.customPrograms} собственных программ детей`} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Занятия по дням" subtitle="Выполненные упражнения и дни" />
          <div className="h-72 p-4">
            <ResponsiveContainer>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="g-ex" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#33B26E" stopOpacity={0.35} />
                    <stop offset="1" stopColor="#33B26E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#EEF5F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7E9E88' }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: '#7E9E88' }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="exercises" name="Упражнений" stroke="#33B26E" strokeWidth={2.5} fill="url(#g-ex)" />
                <Area type="monotone" dataKey="completed" name="Дней выполнено" stroke="#17593A" strokeWidth={2} fill="transparent" />
                <Area type="monotone" dataKey="missed" name="Пропущено" stroke="#E24B4A" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Кто пользуется" subtitle="Роли и языки" />
          <div className="h-44 p-2">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={roles} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={roles.length > 1 ? 3 : 0}>
                  {roles.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 px-5 pb-5">
            {data.languages.map((l) => (
              <div key={l.language} className="flex items-center gap-3 text-sm">
                <span className="w-24 text-soft">{LANG_LABEL[l.language] ?? l.language}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-shade">
                  <div className="h-full rounded-full bg-green" style={{ width: `${(l.users / Math.max(1, t.users)) * 100}%` }} />
                </div>
                <span className="w-8 text-right font-semibold tabular-nums">{l.users}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Новые пользователи" subtitle="Регистрации по дням" />
          <div className="h-56 p-4">
            <ResponsiveContainer>
              <BarChart data={series}>
                <CartesianGrid stroke="#EEF5F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#7E9E88' }} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis tick={{ fontSize: 10, fill: '#7E9E88' }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#E9F6EE' }} />
                <Bar dataKey="signups" name="Регистраций" fill="#17593A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="AI-проверка" subtitle="Доля принятых попыток, %" />
          <div className="h-56 p-4">
            <ResponsiveContainer>
              <AreaChart data={series}>
                <CartesianGrid stroke="#EEF5F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#7E9E88' }} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#7E9E88' }} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="aiRate" name="Принято, %" stroke="#7F77DD" strokeWidth={2.5} fill="#7F77DD22" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Дни недели" subtitle="Когда чаще всего занимаются" />
          <div className="h-56 p-4">
            <ResponsiveContainer>
              <BarChart data={WEEKDAYS.map((d, i) => ({ d, done: data.weekdays.find((w) => w.weekday === i + 1)?.done ?? 0 }))}>
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: '#7E9E88' }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#E9F6EE' }} />
                <Bar dataKey="done" name="Упражнений" fill="#33B26E" radius={[8, 8, 8, 8]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Популярные упражнения" subtitle="Сколько раз выполнено и как их принимает AI" />
          <div className="divide-y divide-line/70">
            {data.topExercises.map((e, i) => {
              const cat = categoryOf(e.category);
              const rate = e.attempts ? Math.round((e.accepted / e.attempts) * 100) : null;
              return (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-5 text-xs font-bold text-muted">{i + 1}</span>
                  <span className="grid size-9 place-items-center rounded-xl text-base" style={{ background: cat.color }}>
                    {cat.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{e.name}</div>
                    <div className="text-xs text-muted">{fmtNum(e.done)} выполнений</div>
                  </div>
                  {rate !== null ? <Badge tone={rate >= 70 ? 'green' : rate >= 40 ? 'gold' : 'red'}>AI {rate}%</Badge> : null}
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardHeader title="Программы в работе" subtitle="Сколько семей сейчас занимается по программе" />
          <div className="divide-y divide-line/70">
            {data.programs.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted">Пока ни одна программа не назначена</p> : null}
            {data.programs.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-muted">{p.isPreset ? 'Базовый пакет' : 'Своя программа ребенка'}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-forest tabular-nums">{p.families}</div>
                  <div className="text-[10px] text-muted">семей</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
