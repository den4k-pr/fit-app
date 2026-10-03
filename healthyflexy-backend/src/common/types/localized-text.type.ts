import { AppLanguage } from '../enums';

/** Текст усіма підтримуваними мовами (зберігається як jsonb): { uk, pl, en } */
export type LocalizedText = Record<AppLanguage, string>;
