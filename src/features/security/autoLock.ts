/**
 * Si al volver a primer plano corresponde bloquear la app.
 * @param backgroundedAt Cuándo pasó a segundo plano (ms) o `null` si no pasó.
 * @param timeoutMinutes Minutos de gracia (0 = bloquear siempre).
 */
export function shouldLockOnResume(backgroundedAt: number | null, now: number, timeoutMinutes: number): boolean {
  if (backgroundedAt === null) return false;
  return now - backgroundedAt >= Math.max(0, timeoutMinutes) * 60_000;
}

/** Opciones de tiempo de bloqueo automático (minutos). */
export const LOCK_TIMEOUT_OPTIONS = [
  { value: 0, label: 'Inmediato' },
  { value: 1, label: '1 min' },
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
] as const;
