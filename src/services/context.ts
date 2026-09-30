import type { AppDatabase } from '@/db/types';

/** Dependencias de los repositorios SQLite (inyectables en tests). */
export type RepositoryContext = {
  db: AppDatabase;
  /** Genera un UUID v4. */
  newId: () => string;
  /** Timestamp actual en ISO 8601. */
  now: () => string;
};

/** Campos de sistema para una fila nueva. */
export function newRowFields(ctx: RepositoryContext) {
  const timestamp = ctx.now();
  return { id: ctx.newId(), createdAt: timestamp, updatedAt: timestamp, deletedAt: null };
}

/** Error cuando se busca un registro que no existe (o fue eliminado). */
export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} no encontrado: ${id}`);
    this.name = 'NotFoundError';
  }
}
