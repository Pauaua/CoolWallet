import type { DataRepository } from '../types';

import { BACKUP_APP_ID, BACKUP_SCHEMA_VERSION, parseBackup, summarizeBackup, type BackupFile, type BackupSummary } from './backupFormat';

/** Arma el respaldo completo con la versión del esquema y la fecha. */
export async function createBackup(data: DataRepository, now: string): Promise<BackupFile> {
  return { app: BACKUP_APP_ID, schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: now, data: await data.exportAll() };
}

/** Texto del archivo (JSON legible). */
export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export type PreparedImport = { ok: true; backup: BackupFile; summary: BackupSummary } | { ok: false; error: string };

/** Valida un archivo de respaldo y arma el resumen para confirmar. */
export function prepareImport(text: string): PreparedImport {
  const result = parseBackup(text);
  if (!result.ok) return result;
  return { ok: true, backup: result.backup, summary: summarizeBackup(result.backup) };
}

/** Reemplaza todos los datos por los del respaldo (en una transacción). */
export async function importBackup(data: DataRepository, backup: BackupFile): Promise<void> {
  await data.replaceAll(backup.data);
}
