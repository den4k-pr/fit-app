import clsx from 'clsx';
import { Check, Loader2, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

// ───────── Кнопка ─────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
const BUTTON: Record<ButtonVariant, string> = {
  primary: 'bg-green-button text-white shadow-[0_3px_0_#1F8350] hover:brightness-105 active:translate-y-px active:shadow-[0_2px_0_#1F8350]',
  secondary: 'bg-white text-forest border border-line hover:border-green-border hover:bg-green-light',
  ghost: 'text-soft hover:bg-green-light hover:text-forest',
  danger: 'bg-white text-red border border-red/30 hover:bg-red-bg',
  dark: 'bg-forest text-white hover:bg-deep',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-base',
        BUTTON[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ───────── Картка ─────────
export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={clsx('rounded-2xl border border-line bg-white shadow-card', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/70 px-5 py-4">
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-0.5 grid size-9 place-items-center rounded-xl bg-green-light text-forest">{icon}</div> : null}
        <div>
          <h3 className="text-[15px] font-bold text-ink">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

// ───────── Поля ─────────
export function Field({ label, hint, error, children, className }: { label?: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx('block', className)}>
      {label ? <span className="mb-1.5 block text-xs font-semibold text-soft">{label}</span> : null}
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-red">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

const inputBase =
  'w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink placeholder:text-muted/70 outline-none transition focus:border-green focus:ring-4 focus:ring-green/15 disabled:bg-shade';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={clsx(inputBase, 'h-10', className)} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  // з явним rows висоту задає кількість рядків, інакше — зручна мінімальна висота
  return <textarea {...rest} className={clsx(inputBase, !rest.rows && 'min-h-[84px]', 'resize-y py-2.5 leading-relaxed', className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={clsx(inputBase, 'h-10 cursor-pointer pr-8', className)}>
      {children}
    </select>
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  placeholder,
  suffix,
  className,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={clsx('relative', className)}>
      <Input
        type="number"
        inputMode="numeric"
        value={value ?? ''}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={suffix ? 'pr-12' : undefined}
      />
      {suffix ? <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs text-muted">{suffix}</span> : null}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="inline-flex items-center gap-2.5 text-sm font-medium text-ink" role="switch" aria-checked={checked}>
      <span className={clsx('relative h-6 w-11 rounded-full transition-colors', checked ? 'bg-green' : 'bg-line')}>
        <span className={clsx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
      {label}
    </button>
  );
}

export function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition',
        selected ? 'border-green bg-green-light text-forest' : 'border-line bg-white text-soft hover:border-green-border',
      )}
    >
      {selected ? <Check className="size-3.5" /> : null}
      {children}
    </button>
  );
}

// ───────── Мітки ─────────
const BADGE = {
  green: 'bg-green-light text-forest border-green-border',
  gold: 'bg-gold-soft text-[#633806] border-[#EDD9A3]',
  red: 'bg-red-bg text-red border-red/20',
  gray: 'bg-shade text-soft border-line',
  dark: 'bg-forest text-mint border-forest',
};
export function Badge({ tone = 'gray', children, className }: { tone?: keyof typeof BADGE; children: ReactNode; className?: string }) {
  return <span className={clsx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap', BADGE[tone], className)}>{children}</span>;
}

// ───────── Сегментований перемикач / вкладки ─────────
export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { id: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={clsx('inline-flex rounded-xl bg-shade p-1 ring-1 ring-line', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={clsx('h-8 rounded-lg px-3 text-xs font-semibold transition', value === o.id ? 'bg-white text-forest shadow-card' : 'text-muted hover:text-forest')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ───────── Стани ─────────
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('size-6 animate-spin text-green', className)} />;
}

export function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Spinner className="size-8" />
    </div>
  );
}

export function EmptyState({ illustration, title, text, action }: { illustration?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {illustration}
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      {text ? <p className="mt-1 max-w-sm text-sm text-muted">{text}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="border-red/30 bg-red-bg p-5 text-sm text-red">
      <p className="font-semibold">Не удалось загрузить</p>
      <p className="mt-1">{message}</p>
      {onRetry ? (
        <Button variant="danger" size="sm" className="mt-3" onClick={onRetry}>
          Попробовать еще раз
        </Button>
      ) : null}
    </Card>
  );
}

// ───────── Модальне вікно ─────────
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        className={clsx('flex max-h-[90vh] w-full animate-pop flex-col rounded-2xl bg-white shadow-lift', wide ? 'max-w-3xl' : 'max-w-md')}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-base font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-shade hover:text-ink" aria-label="Закрыть">
            <X className="size-5" />
          </button>
        </div>
        <div className="scrollbar-thin overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel = 'Подтвердить',
  danger,
  loading,
  requireText,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  text: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  /** Для незворотних дій: треба ввести це слово */
  requireText?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const ready = !requireText || typed.trim().toLowerCase() === requireText.toLowerCase();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} disabled={!ready} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-soft">{text}</div>
      {requireText ? (
        <Field className="mt-4" label={<>Чтобы подтвердить, введите «{requireText}»</>}>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
        </Field>
      ) : null}
    </Modal>
  );
}

// ───────── Сповіщення ─────────
type Toast = { id: number; text: string; tone: 'success' | 'error' };
const ToastContext = createContext<(text: string, tone?: Toast['tone']) => void>(() => undefined);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'pointer-events-auto flex max-w-sm animate-rise items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lift',
              t.tone === 'success' ? 'bg-forest text-white' : 'bg-red text-white',
            )}
          >
            {t.tone === 'success' ? <Check className="mt-0.5 size-4 shrink-0 text-mint" /> : <X className="mt-0.5 size-4 shrink-0" />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ───────── Заголовок сторінки ─────────
export function PageHeader({ title, subtitle, actions, illustration }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; illustration?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-4">
        {illustration}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatTile({ label, value, hint, icon, tone = 'white' }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: 'white' | 'forest' | 'gold' }) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl p-4 shadow-card',
        tone === 'white' && 'border border-line bg-white',
        tone === 'forest' && 'bg-forest text-white',
        tone === 'gold' && 'bg-gradient-to-br from-[#D4A017] via-[#F0C040] to-[#9C7420] text-white',
      )}
    >
      {icon ? <div className={clsx('absolute top-3.5 right-3.5 opacity-80', tone === 'white' ? 'text-muted' : 'text-mint')}>{icon}</div> : null}
      <div className={clsx('text-[26px] leading-tight font-extrabold tabular-nums', tone === 'forest' && 'text-mint')}>{value}</div>
      <div className={clsx('mt-0.5 text-xs font-medium', tone === 'white' ? 'text-muted' : 'text-white/75')}>{label}</div>
      {hint ? <div className={clsx('mt-1.5 text-[11px]', tone === 'white' ? 'text-soft' : 'text-white/70')}>{hint}</div> : null}
    </div>
  );
}
