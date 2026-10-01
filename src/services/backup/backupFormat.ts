import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import {
  accounts,
  budgets,
  categories,
  debtPayments,
  debts,
  fixedExpenseOccurrences,
  fixedExpenses,
  profile,
  savingsGoals,
  settings,
  transactions,
} from '@/db/schema';

/**
 * Versión del formato del respaldo. Súbela cuando cambie el esquema de forma
 * que un respaldo antiguo necesite transformarse, y agrega su paso en `BACKUP_MIGRATIONS`.
 */
export const BACKUP_SCHEMA_VERSION = 2;
export const BACKUP_APP_ID = 'control-gastos';

/** Tablas del respaldo, en orden seguro para insertar (padres antes que hijos). */
export const BACKUP_TABLES = {
  profile,
  settings,
  accounts,
  categories,
  fixedExpenses,
  debts,
  transactions,
  fixedExpenseOccurrences,
  debtPayments,
  budgets,
  savingsGoals,
} as const;

export type BackupTableName = keyof typeof BACKUP_TABLES;

/** Validación de cada tabla, generada desde el esquema Drizzle (misma fuente de verdad). */
const backupDataSchema = z.object({
  profile: z.array(createSelectSchema(profile)),
  settings: z.array(createSelectSchema(settings)),
  accounts: z.array(createSelectSchema(accounts)),
  categories: z.array(createSelectSchema(categories)),
  fixedExpenses: z.array(createSelectSchema(fixedExpenses)),
  debts: z.array(createSelectSchema(debts)),
  transactions: z.array(createSelectSchema(transactions)),
  fixedExpenseOccurrences: z.array(createSelectSchema(fixedExpenseOccurrences)),
  debtPayments: z.array(createSelectSchema(debtPayments)),
  budgets: z.array(createSelectSchema(budgets)),
  savingsGoals: z.array(createSelectSchema(savingsGoals)),
});

export type BackupData = z.infer<typeof backupDataSchema>;

export const backupFileSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
  exportedAt: z.string(),
  data: backupDataSchema,
});

export type BackupFile = z.infer<typeof backupFileSchema>;

/** Encabezado mínimo para leer la versión antes de validar el contenido completo. */
const backupHeaderSchema = z.object({
  app: z.literal(BACKUP_APP_ID, { error: 'El archivo no es un respaldo de Control de Gastos.' }),
  schemaVersion: z.number({ error: 'El respaldo no indica su versión.' }).int().min(1),
});

/** Transformaciones de respaldos antiguos: la clave es la versión de ORIGEN. */
type RawBackup = Record<string, unknown> & { schemaVersion: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const BACKUP_MIGRATIONS: Record<number, (backup: RawBackup) => RawBackup> = {
  /** v1 → v2: `settings.reminderDaysBefore` (avisos de vencimiento), por defecto 1 día. */
  1: (backup) => {
    const data = isRecord(backup.data) ? backup.data : {};
    const settingsRows = Array.isArray(data.settings) ? data.settings : [];
    return {
      ...backup,
      data: { ...data, settings: settingsRows.map((row: unknown) => (isRecord(row) ? { reminderDaysBefore: 1, ...row } : row)) },
    };
  },
};

export type ParseBackupResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

/** Lee, migra y valida un respaldo. Nunca lanza: devuelve un error legible. */
export function parseBackup(text: string): ParseBackupResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' };
  }

  const header = backupHeaderSchema.safeParse(raw);
  if (!header.success) return { ok: false, error: header.error.issues[0]?.message ?? 'Respaldo inválido.' };
  if (header.data.schemaVersion > BACKUP_SCHEMA_VERSION) {
    return { ok: false, error: 'Este respaldo es de una versión más nueva de la app. Actualiza la app para importarlo.' };
  }

  let migrated = raw as RawBackup;
  for (let version = header.data.schemaVersion; version < BACKUP_SCHEMA_VERSION; version += 1) {
    const step = BACKUP_MIGRATIONS[version];
    if (!step) return { ok: false, error: `No sabemos convertir respaldos de la versión ${version}.` };
    migrated = { ...step(migrated), schemaVersion: version + 1 };
  }

  const parsed = backupFileSchema.safeParse(migrated);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `El respaldo está dañado o incompleto${issue ? ` (${issue.path.join('.')})` : ''}.` };
  }
  return { ok: true, backup: parsed.data };
}

export type BackupSummary = {
  exportedAt: string;
  profileName: string | null;
  accounts: number;
  categories: number;
  transactions: number;
  fixedExpenses: number;
  debts: number;
  budgets: number;
  savingsGoals: number;
};

/** Resumen para confirmar antes de importar (solo registros activos). */
export function summarizeBackup(backup: BackupFile): BackupSummary {
  const active = <T extends { deletedAt: string | null }>(rows: readonly T[]) => rows.filter((row) => row.deletedAt === null).length;
  const { data } = backup;
  return {
    exportedAt: backup.exportedAt,
    profileName: data.profile.find((row) => row.deletedAt === null)?.name ?? null,
    accounts: active(data.accounts),
    categories: active(data.categories),
    transactions: active(data.transactions),
    fixedExpenses: active(data.fixedExpenses),
    debts: active(data.debts),
    budgets: active(data.budgets),
    savingsGoals: active(data.savingsGoals),
  };
}

/** Nombre sugerido del archivo: `respaldo-control-gastos-2026-09-30.json`. */
export function backupFileName(isoDate: string): string {
  return `respaldo-control-gastos-${isoDate.slice(0, 10)}.json`;
}
