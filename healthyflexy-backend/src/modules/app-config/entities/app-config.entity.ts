import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Палітра застосунку: ключі — токени кольорів мобільного застосунку (див. mobile `theme/tokens.ts`) */
export type ThemeColors = Record<string, string>;

export interface AppTheme {
  /** Id пресета з CRM («green», «ocean»…) або «custom» */
  presetId: string;
  colors: ThemeColors;
}

/** Перевизначення текстів екранів: мова → ключ i18n → текст */
export type ContentOverrides = Record<string, Record<string, string>>;

export interface AppLimits {
  /** Скільки вправ максимум потрапляє в один день (навіть якщо в програмі більше) */
  maxExercisesPerDay: number;
  /** Скільки вправ максимум можна додати у власну програму */
  maxProgramExercises: number;
}

export const DEFAULT_LIMITS: AppLimits = { maxExercisesPerDay: 12, maxProgramExercises: 20 };

/**
 * Налаштування застосунку, які редагує CRM: палітра, тексти екранів, ліміти вправ. Один рядок (id = 1).
 * Мобільний застосунок тягне їх публічним GET /app-config і кешує на пристрої.
 */
@Entity({ name: 'app_config' })
export class AppConfig {
  @PrimaryColumn({ type: 'int' })
  id: number;

  /** null — стандартна зелена палітра застосунку */
  @Column({ type: 'jsonb', nullable: true })
  theme: AppTheme | null;

  @Column({ type: 'jsonb', default: () => `'{}'` })
  content: ContentOverrides;

  @Column({ type: 'jsonb', default: () => `'{}'` })
  limits: Partial<AppLimits>;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
