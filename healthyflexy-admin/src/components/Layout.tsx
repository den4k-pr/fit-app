import clsx from 'clsx';
import {
  BarChart3,
  Dumbbell,
  Gauge,
  LayoutGrid,
  LogOut,
  Menu,
  Palette,
  Type,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useAuth } from '@/auth/AuthContext';

const NAV = [
  { to: '/', label: 'Обзор', icon: BarChart3, end: true },
  { to: '/users', label: 'Пользователи', icon: Users },
  { to: '/exercises', label: 'Упражнения', icon: Dumbbell },
  { to: '/programs', label: 'Программы', icon: LayoutGrid },
  { section: 'Вид приложения' },
  { to: '/design', label: 'Дизайн и цвета', icon: Palette },
  { to: '/texts', label: 'Тексты и онбординг', icon: Type },
  { to: '/limits', label: 'Лимиты упражнений', icon: Gauge },
] as const;

function Logo() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="grid size-10 place-items-center rounded-xl bg-mint/15 ring-1 ring-mint/30">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
          <path d="M12 21s-8-4.9-8-10.9A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 3.1C20 16.1 12 21 12 21z" fill="#BDF2D2" />
        </svg>
      </div>
      <div>
        <div className="text-sm leading-tight font-extrabold text-white">Книжка заботы</div>
        <div className="text-[11px] font-medium text-mint/70">Панель управления</div>
      </div>
    </div>
  );
}

export function Layout() {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="mt-8 flex flex-1 flex-col gap-1">
      {NAV.map((item, i) =>
        'section' in item ? (
          <div key={i} className="mt-5 mb-1 px-3 text-[10px] font-bold tracking-[0.12em] text-mint/50 uppercase">
            {item.section}
          </div>
        ) : (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                isActive ? 'bg-white text-forest shadow-card' : 'text-white/75 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <item.icon className="size-[18px]" />
            {item.label}
          </NavLink>
        ),
      )}
    </nav>
  );

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-forest px-4 py-6 lg:flex">
        <Logo />
        {nav}
        <button onClick={logout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white">
          <LogOut className="size-[18px]" /> Выйти
        </button>
      </aside>

      {/* мобільна шапка */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between bg-forest px-4 lg:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-white" aria-label="Меню">
          <Menu className="size-5" />
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-ink/40" />
          <aside className="relative flex h-full w-72 animate-rise flex-col bg-forest px-4 py-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <Logo />
              <button onClick={() => setOpen(false)} className="p-1 text-white" aria-label="Закрыть">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            <button onClick={logout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/60">
              <LogOut className="size-[18px]" /> Выйти
            </button>
          </aside>
        </div>
      ) : null}

      <main className="min-w-0 flex-1 px-4 pt-20 pb-12 sm:px-8 lg:pt-8">
        <div className="mx-auto max-w-7xl animate-rise">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
