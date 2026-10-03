import { Lock, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { HeroIllustration } from '@/components/illustrations';
import { Button, Field, Input } from '@/components/ui';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-forest p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-deep/60" />
        <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-deep/40" />
        <div className="relative flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-mint/15 ring-1 ring-mint/30">
            <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
              <path d="M12 21s-8-4.9-8-10.9A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 3.1C20 16.1 12 21 12 21z" fill="#BDF2D2" />
            </svg>
          </div>
          <span className="text-lg font-extrabold text-white">Книжка заботы</span>
        </div>
        <HeroIllustration className="relative mx-auto w-full max-w-lg animate-pop" />
        <div className="relative">
          <h2 className="text-3xl leading-tight font-extrabold text-white">
            Все о приложении —<br />в одном месте
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-mint/80">
            Пользователи и их прогресс, упражнения и готовые программы, цвета и тексты приложения. Изменения доходят до телефонов без новой версии.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm animate-rise">
          <div className="mb-8">
            <div className="mb-4 inline-flex rounded-full bg-green-light px-3 py-1 text-xs font-bold text-forest">Панель администратора</div>
            <h1 className="text-3xl font-extrabold tracking-tight">Вход</h1>
            <p className="mt-2 text-sm text-muted">Почта и пароль администратора заданы в настройках сервера.</p>
          </div>
          <div className="space-y-4">
            <Field label="Почта">
              <div className="relative">
                <Mail className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                <Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="admin@example.com" />
              </div>
            </Field>
            <Field label="Пароль">
              <div className="relative">
                <Lock className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" placeholder="••••••••••" />
              </div>
            </Field>
            {error ? <div className="animate-rise rounded-xl bg-red-bg px-3.5 py-2.5 text-sm font-medium text-red">{error}</div> : null}
            <Button type="submit" size="lg" loading={loading} className="w-full">
              Войти
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
