import { z } from 'zod';

import { parseCLPInput } from '@/lib/finance';

const MAX_AMOUNT = 1_000_000_000;

/**
 * Monto escrito como texto ("1.200.000") → pesos enteros.
 * @param requiredMessage Mensaje si está vacío o no es un número.
 * @param options.positive Exigir monto mayor a 0 (movimientos).
 */
export function amountText(requiredMessage: string, options: { positive?: boolean } = {}) {
  const number = z
    .number({ error: requiredMessage })
    .int()
    .min(options.positive ? 1 : 0, options.positive ? 'El monto debe ser mayor a $0' : 'El monto no puede ser negativo')
    .max(MAX_AMOUNT, 'Revisa el monto: es demasiado alto');
  return z
    .string()
    .transform((text) => parseCLPInput(text) ?? NaN)
    .pipe(number);
}

/** Fecha de calendario `yyyy-MM-dd`. */
export const isoDateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige una fecha válida');

/** Nota opcional: se recorta y el texto vacío se guarda como `null`. */
export const noteField = z
  .string()
  .trim()
  .max(120, 'Usa máximo 120 caracteres')
  .transform((text) => (text === '' ? null : text));
