import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AppConfig,
  AppLimits,
  AppTheme,
  ContentOverrides,
  DEFAULT_LIMITS,
} from './entities/app-config.entity';

export interface AppConfigView {
  theme: AppTheme | null;
  content: ContentOverrides;
  limits: AppLimits;
  /** Мітка версії: клієнт порівнює її з кешем і перезавантажує тему лише коли щось змінилось */
  version: string;
}

const ROW_ID = 1;
/** Кеш короткий: якщо сервер масштабують на кілька інстансів, зміни з CRM дійдуть до всіх за хвилину */
const CACHE_TTL_MS = 60_000;

/** Налаштування застосунку з CRM. Кеш у пам'яті (читаються на кожен старт застосунку й при доборі вправ дня). */
@Injectable()
export class AppConfigService {
  private cache: AppConfigView | null = null;
  private cachedAt = 0;

  constructor(@InjectRepository(AppConfig) private readonly configs: Repository<AppConfig>) {}

  async get(): Promise<AppConfigView> {
    if (this.cache && Date.now() - this.cachedAt < CACHE_TTL_MS) return this.cache;
    const row = await this.configs.findOne({ where: { id: ROW_ID } });
    this.cache = {
      theme: row?.theme ?? null,
      content: row?.content ?? {},
      limits: { ...DEFAULT_LIMITS, ...(row?.limits ?? {}) },
      version: row ? row.updatedAt.toISOString() : 'default',
    };
    this.cachedAt = Date.now();
    return this.cache;
  }

  async limits(): Promise<AppLimits> {
    return (await this.get()).limits;
  }

  async update(patch: {
    theme?: AppTheme | null;
    content?: ContentOverrides;
    limits?: Partial<AppLimits>;
  }): Promise<AppConfigView> {
    const current =
      (await this.configs.findOne({ where: { id: ROW_ID } })) ??
      this.configs.create({ id: ROW_ID, theme: null, content: {}, limits: {} });
    if (patch.theme !== undefined) current.theme = patch.theme;
    if (patch.content !== undefined) current.content = patch.content;
    if (patch.limits !== undefined) current.limits = { ...current.limits, ...patch.limits };
    await this.configs.save(current);
    this.cache = null;
    return this.get();
  }
}
