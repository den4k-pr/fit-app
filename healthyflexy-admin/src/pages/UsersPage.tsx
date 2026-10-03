import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { errorMessage } from '@/api/client';
import { useUsers, type UsersFilter } from '@/api/hooks';
import { EmptyIllustration, PeopleIllustration } from '@/components/illustrations';
import { Badge, Button, Card, EmptyState, ErrorBox, Input, PageHeader, PageLoader, Select } from '@/components/ui';
import { ROLE_LABEL } from '@/data/labels';
import { fmtAgo, fmtDate, fmtMoney, initials } from '@/lib/format';

export function UsersPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<UsersFilter>({ search: '', role: '', status: '', sort: 'createdAt', page: 1 });
  const [searchText, setSearchText] = useState('');

  // пошук з невеликою затримкою, щоб не смикати сервер на кожну літеру
  useEffect(() => {
    const timer = setTimeout(() => setFilter((f) => (f.search === searchText ? f : { ...f, search: searchText, page: 1 })), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data, isLoading, error, refetch, isFetching } = useUsers(filter);
  const pages = data ? Math.max(1, Math.ceil(data.total / 20)) : 1;
  const set = (patch: Partial<UsersFilter>) => setFilter((f) => ({ ...f, ...patch, page: 1 }));

  return (
    <>
      <PageHeader
        illustration={<PeopleIllustration />}
        title="Пользователи"
        subtitle="Поиск, фильтры и статистика каждого: сколько дней выполнено, сколько заработано, как их оценивает AI."
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Имя, почта или телефон" className="pl-10" />
          </div>
          <Select value={filter.role} onChange={(e) => set({ role: e.target.value as UsersFilter['role'] })} className="w-auto">
            <option value="">Все роли</option>
            <option value="parent">Родители</option>
            <option value="child">Дети</option>
            <option value="none">Без роли</option>
          </Select>
          <Select value={filter.status} onChange={(e) => set({ status: e.target.value as UsersFilter['status'] })} className="w-auto">
            <option value="">Любой статус</option>
            <option value="active">Активные</option>
            <option value="blocked">Заблокированные</option>
          </Select>
          <Select value={filter.sort} onChange={(e) => set({ sort: e.target.value as UsersFilter['sort'] })} className="w-auto">
            <option value="createdAt">Сначала новые</option>
            <option value="lastLoginAt">Недавно заходили</option>
            <option value="name">По имени</option>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <PageLoader />
      ) : error || !data ? (
        <ErrorBox message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <Card>
          <EmptyState illustration={<EmptyIllustration />} title="Никого не найдено" text="Попробуйте изменить поиск или фильтры." />
        </Card>
      ) : (
        <Card className={clsx('overflow-hidden transition-opacity', isFetching && 'opacity-70')}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line bg-shade text-left text-[11px] font-bold tracking-wide text-muted uppercase">
                  <th className="px-5 py-3">Пользователь</th>
                  <th className="px-3 py-3">Роль</th>
                  <th className="px-3 py-3 text-right">Дней</th>
                  <th className="px-3 py-3 text-right">Упражн.</th>
                  <th className="px-3 py-3 text-right">Заработано</th>
                  <th className="px-3 py-3 text-right">AI</th>
                  <th className="px-3 py-3">Активность</th>
                  <th className="px-5 py-3">Зарегистр.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {data.items.map((u) => {
                  const ai = u.stats.aiAttempts ? Math.round((u.stats.aiAccepted / u.stats.aiAttempts) * 100) : null;
                  return (
                    <tr key={u.id} onClick={() => navigate(`/users/${u.id}`)} className="cursor-pointer transition hover:bg-green-light/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={clsx('grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold', u.role === 'child' ? 'bg-green text-white' : 'bg-forest text-mint')}>
                            {initials(u.name, u.email ?? u.phone)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 font-semibold">
                              <span className="truncate">{u.name ?? 'Без имени'}</span>
                              {u.blockedAt ? <Badge tone="red">Заблокирован</Badge> : null}
                            </div>
                            <div className="truncate text-xs text-muted">{u.email ?? u.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">{u.role ? <Badge tone={u.role === 'parent' ? 'dark' : 'green'}>{ROLE_LABEL[u.role]}</Badge> : <Badge>—</Badge>}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">{u.stats.completedDays}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{u.stats.exercisesDone}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{fmtMoney(u.stats.earned)}</td>
                      <td className="px-3 py-3 text-right">{ai === null ? <span className="text-muted">—</span> : <Badge tone={ai >= 70 ? 'green' : ai >= 40 ? 'gold' : 'red'}>{ai}%</Badge>}</td>
                      <td className="px-3 py-3 text-xs text-soft">{fmtAgo(u.stats.lastActivityAt ?? u.lastLoginAt)}</td>
                      <td className="px-5 py-3 text-xs text-muted">{fmtDate(u.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
            <span className="text-muted">Всего: {data.total}</span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={filter.page <= 1} onClick={() => setFilter((f) => ({ ...f, page: f.page - 1 }))} icon={<ChevronLeft className="size-4" />} />
              <span className="text-xs font-semibold text-soft">
                {filter.page} / {pages}
              </span>
              <Button variant="secondary" size="sm" disabled={filter.page >= pages} onClick={() => setFilter((f) => ({ ...f, page: f.page + 1 }))} icon={<ChevronRight className="size-4" />} />
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
