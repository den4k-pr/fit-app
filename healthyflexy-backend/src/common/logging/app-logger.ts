import { LoggerService, LogLevel } from '@nestjs/common';

type Format = 'pretty' | 'json';

/** Службові повідомлення Nest при старті (десятки рядків «dependencies initialized») ховають корисні логи */
const QUIET_CONTEXTS = new Set([
  'InstanceLoader',
  'RoutesResolver',
  'RouterExplorer',
  'NestFactory',
  'NestApplication',
  'WebSocketsController',
]);

const COLORS: Partial<Record<LogLevel, string>> = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  debug: '\x1b[90m',
};
const RESET = '\x1b[0m';

/**
 * Логер застосунку. `LOG_FORMAT=json` → по одному JSON-рядку на запис (Railway / Loki / Datadog розбирають самі);
 * `pretty` → читабельний рядок для розробки: `POST /api/v1/auth/otp/request → 429 12ms OTP_COOLDOWN`.
 * Ніколи не логуємо OTP-коди реальних користувачів, токени, тіла запитів.
 */
export class AppLogger implements LoggerService {
  constructor(
    private readonly format: Format = 'pretty',
    private readonly levels: LogLevel[] = ['log', 'error', 'warn', 'debug'],
  ) {}

  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }
  error(message: unknown, stackOrContext?: string, context?: string): void {
    this.write('error', message, context ?? stackOrContext, context ? stackOrContext : undefined);
  }
  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }
  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  private write(level: LogLevel, message: unknown, context?: string, stack?: string): void {
    if (!this.levels.includes(level)) return;
    if (level === 'log' && context && QUIET_CONTEXTS.has(context)) return;
    const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
    if (this.format === 'json') {
      const entry =
        typeof message === 'object' && message !== null ? message : { msg: String(message) };
      stream.write(
        `${JSON.stringify({ time: new Date().toISOString(), level, context, ...entry, stack })}\n`,
      );
      return;
    }
    const color = stream.isTTY ? (COLORS[level] ?? '') : '';
    const reset = color ? RESET : '';
    const time = new Date().toISOString().slice(11, 23);
    stream.write(
      `${color}${time} ${level.toUpperCase().padEnd(5)} [${context ?? 'App'}] ${this.text(message)}${reset}${stack ? `\n${stack}` : ''}\n`,
    );
  }

  private text(message: unknown): string {
    if (typeof message === 'string') return message;
    if (typeof message !== 'object' || message === null) return String(message);
    const m = message as Record<string, unknown>;
    if (m.event === 'http') {
      const user = typeof m.userId === 'string' ? ` user=${m.userId.slice(0, 8)}` : '';
      const code = typeof m.code === 'string' ? `  ← ${m.code}` : '';
      return `${String(m.method)} ${String(m.path)} → ${String(m.status)} ${String(m.ms)}ms${code}${user}`;
    }
    return Object.entries(m)
      .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join(' ');
  }
}
