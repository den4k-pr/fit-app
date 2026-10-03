import clsx from 'clsx';
import { ArrowLeft, Ban, Brain, CalendarCheck, Dumbbell, HandCoins, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { errorMessage } from '@/api/client';
import { useUser, useUserMutations } from '@/api/hooks';
import type { UserDetail } from '@/api/types';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  ErrorBox,
  Field,
  Input,
  Modal,
  PageLoader,
  Select,
  StatTile,
  useToast,
} from '@/components/ui';
import { LANG_LABEL, ROLE_LABEL, SESSION_STATUS, WEEKDAYS } from '@/data/labels';
import { fmtAgo, fmtDate, fmtDateTime, fmtMoney, fmtShort, initials } from '@/lib/format';

export function UserDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useUser(id);
  const m = useUserMutations(id);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<'block' | 'delete' | null>(null);

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorBox message={errorMessage(error)} onRetry={() => void refetch()} />;
  const { user } = data;
  const s = user.stats;
  const aiRate = s.aiAttempts ? Math.round((s.aiAccepted / s.aiAttempts) * 100) : null;

  const run = async (action: () => Promise<unknown>, ok: string) => {
    try {
      await action();
      toast(ok);
      setConfirm(null);
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <>
      <Link to="/users" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-soft hover:text-forest">
        <ArrowLeft className="size-4" /> Все пользователи
      </Link>

      <Card className="relative mb-4 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-forest to-deep" />
        <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-5">
          <div className="flex items-end gap-4">
            <div className={clsx('-mt-10 grid size-20 shrink-0 place-items-center rounded-2xl text-2xl font-extrabold shadow-card ring-4 ring-white', user.role === 'child' ? 'bg-green text-white' : 'bg-mint text-forest')}>
              {initials(user.name, user.email ?? user.phone)}
            </div>
            <div className="pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold">{user.name ?? 'Без имени'}</h1>
                {user.role ? <Badge tone={user.role === 'parent' ? 'dark' : 'green'}>{ROLE_LABEL[user.role]}</Badge> : null}
                {user.blockedAt ? <Badge tone="red">Заблокирован {fmtDate(user.blockedAt)}</Badge> : null}
              </div>
              <div className="mt-1 text-sm text-muted">
                {[user.email, user.phone, LANG_LABEL[user.language], user.age ? `${user.age} лет` : null].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
              Редактировать
            </Button>
            <Button variant="secondary" icon={user.blockedAt ? <ShieldCheck className="size-4" /> : <Ban className="size-4" />} onClick={() => setConfirm('block')}>
              {user.blockedAt ? 'Разблокировать' : 'Заблокировать'}
            </Button>
            <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirm('delete')}>
              Удалить
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line px-6 py-3 text-xs text-muted sm:grid-cols-4">
          <span>Зарегистрирован: <b className="text-soft">{fmtDate(user.createdAt)}</b></span>
          <span>Последний вход: <b className="text-soft">{fmtAgo(user.lastLoginAt)}</b></span>
          <span>Часовой пояс: <b className="text-soft">{user.timezone}</b></span>
          <span>Уведомления: <b className="text-soft">{user.pushEnabled ? 'включены' : 'выключены'}</b></span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile tone="forest" label="Дней выполнено" value={s.completedDays} icon={<CalendarCheck className="size-5" />} hint={`${s.missedDays} пропущено`} />
        <StatTile label="Упражнений выполнено" value={s.exercisesDone} icon={<Dumbbell className="size-5" />} />
        <StatTile tone="gold" label="Начислено" value={fmtMoney(s.earned)} icon={<HandCoins className="size-5" />} />
        <StatTile label="AI принимает" value={aiRate === null ? '—' : `${aiRate}%`} icon={<Brain className="size-5" />} hint={`${s.aiAttempts} проверок`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Активность за 30 дней" subtitle="Выполненные упражнения по дням (все семьи пользователя)" />
          <div className="h-60 p-4">
            <ResponsiveContainer>
              <BarChart data={data.activity.map((a) => ({ ...a, label: fmtShort(a.date) }))}>
                <CartesianGrid stroke="#EEF5F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#7E9E88' }} tickLine={false} axisLine={false} minTickGap={18} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#7E9E88' }} tickLine={false} axisLine={false} width={24} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #DCEBE1', fontSize: 12 }} cursor={{ fill: '#E9F6EE' }} />
                <Bar dataKey="done" name="Упражнений" fill="#33B26E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Families families={data.families} userId={user.id} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Дни тренировок" subtitle="Последние 60" />
          <div className="scrollbar-thin max-h-[420px] divide-y divide-line/70 overflow-y-auto">
            {data.sessions.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted">Еще ни одного дня</p> : null}
            {data.sessions.map((d) => {
              const st = SESSION_STATUS[d.status] ?? SESSION_STATUS.pending;
              return (
                <div key={d.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <span className="w-28 font-semibold">{fmtDate(d.date)}</span>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  <div className="ml-auto flex items-center gap-3">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-shade">
                      <div className="h-full rounded-full bg-green" style={{ width: `${(d.exercisesDone / Math.max(1, d.exercisesTotal)) * 100}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs text-muted tabular-nums">
                      {d.exercisesDone}/{d.exercisesTotal}
                    </span>
                    <span className="w-16 text-right font-semibold tabular-nums">{fmtMoney(d.earned)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardHeader title="Проверки AI" subtitle="Последние 30 попыток и причины отказов" />
          <div className="scrollbar-thin max-h-[420px] divide-y divide-line/70 overflow-y-auto">
            {data.attempts.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted">Проверок еще не было</p> : null}
            {data.attempts.map((a) => (
              <div key={a.id} className="px-5 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{a.exerciseName}</span>
                  <Badge tone={a.isCorrect ? 'green' : 'red'}>{a.isCorrect ? 'Засчитано' : 'Отклонено'}</Badge>
                  <span className="ml-auto text-xs text-muted">
                    {fmtDateTime(a.analyzedAt)} · балл {a.score}
                  </span>
                </div>
                <p className="mt-1 text-xs text-soft">{a.feedback}</p>
                {a.issues?.length ? (
                  <ul className="mt-1.5 space-y-1">
                    {a.issues.map((i, k) => (
                      <li key={k} className="flex gap-2 text-xs">
                        <span className="rounded-full bg-red-bg px-2 font-semibold text-red">
                          {i.fromSec === i.toSec ? `${i.fromSec} с` : `${i.fromSec}–${i.toSec} с`}
                        </span>
                        <span className="text-soft">{i.reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Учет вознаграждений" subtitle="Начисления и переводы" />
        <div className="divide-y divide-line/70">
          {data.ledger.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted">Записей пока нет</p> : null}
          {data.ledger.map((l) => (
            <div key={l.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              <Badge tone={l.type === 'earn' ? 'green' : 'gold'}>{l.type === 'earn' ? 'Начисление' : 'Перевод'}</Badge>
              <span className="text-xs text-muted">{fmtDateTime(l.createdAt)}</span>
              <span className="text-xs text-muted">{{ confirmed: 'подтверждено', pending: 'ожидает', rejected: 'отклонено' }[l.status] ?? l.status}</span>
              <span className="ml-auto font-semibold tabular-nums">{fmtMoney(l.amount, l.currency)}</span>
            </div>
          ))}
        </div>
      </Card>

      {editing ? (
        <EditUserModal
          user={user}
          loading={m.update.isPending}
          onClose={() => setEditing(false)}
          onSave={(body) =>
            run(async () => {
              await m.update.mutateAsync(body);
              setEditing(false);
            }, 'Профиль обновлен')
          }
        />
      ) : null}
      <ConfirmDialog
        open={confirm === 'block'}
        title={user.blockedAt ? 'Разблокировать пользователя?' : 'Заблокировать пользователя?'}
        text={
          user.blockedAt
            ? 'Пользователь снова сможет войти в приложение.'
            : 'Пользователь будет сразу выведен со всех устройств и не сможет войти снова. Данные сохранятся — блокировку можно снять в любой момент.'
        }
        confirmLabel={user.blockedAt ? 'Разблокировать' : 'Заблокировать'}
        danger={!user.blockedAt}
        loading={m.block.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => run(() => m.block.mutateAsync(!user.blockedAt), user.blockedAt ? 'Разблокирован' : 'Заблокирован')}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        title="Удалить аккаунт навсегда?"
        text="Будут удалены профиль, семьи, дни тренировок, кадры упражнений и учет. Вторая сторона семьи увидит, что аккаунт удален. Это действие нельзя отменить."
        confirmLabel="Удалить навсегда"
        danger
        requireText="удалить"
        loading={m.remove.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          run(async () => {
            await m.remove.mutateAsync();
            navigate('/users');
          }, 'Аккаунт удален')
        }
      />
    </>
  );
}

function Families({ families, userId }: { families: UserDetail['families']; userId: string }) {
  return (
    <Card>
      <CardHeader title="Семьи" subtitle="Связи родители ↔ дети" />
      <div className="space-y-3 p-4">
        {families.length === 0 ? <p className="py-6 text-center text-sm text-muted">Семьи пока нет</p> : null}
        {families.map((f) => {
          const other = f.parentId === userId ? { id: f.childId, name: f.childName, role: 'Ребенок' } : { id: f.parentId, name: f.parentLabel ?? f.parentName, role: 'Родитель' };
          return (
            <div key={f.id} className="rounded-xl border border-line bg-shade p-3.5">
              <div className="flex items-center justify-between">
                <Link to={`/users/${other.id}`} className="text-sm font-bold text-forest hover:underline">
                  {other.name ?? 'Без имени'}
                </Link>
                <Badge>{other.role}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-soft">
                <span>Ставка: <b>{fmtMoney(f.rate, f.currency)}</b>/день</span>
                <span>Тренировка: <b>{f.workoutMinutes} мин</b></span>
                <span className="col-span-2">Дни: <b>{f.planDays.map((d) => WEEKDAYS[d - 1]).join(', ')}</b></span>
                <span className="col-span-2">Программа: <b>{f.programName ?? '—'}</b></span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function EditUserModal({
  user,
  loading,
  onClose,
  onSave,
}: {
  user: UserDetail['user'];
  loading: boolean;
  onClose: () => void;
  onSave: (body: { name?: string; age?: number | null; language?: string }) => void;
}) {
  const [name, setName] = useState(user.name ?? '');
  const [age, setAge] = useState(user.age?.toString() ?? '');
  const [language, setLanguage] = useState<string>(user.language);
  return (
    <Modal
      open
      onClose={onClose}
      title="Редактировать профиль"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button loading={loading} disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), age: age ? Number(age) : null, language })}>
            Сохранить
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Имя">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        </Field>
        <Field label="Возраст" hint="16–120, можно оставить пустым">
          <Input type="number" min={16} max={120} value={age} onChange={(e) => setAge(e.target.value)} />
        </Field>
        <Field label="Язык приложения">
          <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {Object.entries(LANG_LABEL).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
