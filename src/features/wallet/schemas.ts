import { z } from 'zod';

import { amountText, isoDateField, noteField } from '@/features/forms/fields';
import { ACCOUNT_TYPES } from '@/types/enums';

const accountIdField = z.string({ error: 'Elige una cuenta' }).min(1, 'Elige una cuenta');

/** Ingreso extra o edición de un movimiento. */
export const movementSchema = z.object({
  amount: amountText('Ingresa el monto', { positive: true }),
  date: isoDateField,
  accountId: accountIdField,
  categoryId: z.string().nullable(),
  note: noteField,
});
export type MovementFormValues = z.input<typeof movementSchema>;
export type MovementFormOutput = z.output<typeof movementSchema>;

/** Saldo real de una cuenta; `isNegative` para tarjetas o cuentas sobregiradas. */
export const adjustmentSchema = z
  .object({
    accountId: accountIdField,
    realBalance: amountText('Ingresa el saldo real (puede ser 0)'),
    isNegative: z.boolean(),
    note: noteField,
  })
  .transform(({ realBalance, isNegative, ...rest }) => ({ ...rest, realBalance: isNegative ? -realBalance : realBalance }));
export type AdjustmentFormValues = z.input<typeof adjustmentSchema>;
export type AdjustmentFormOutput = z.output<typeof adjustmentSchema>;

export const accountSchema = z
  .object({
    name: z.string().trim().min(1, 'Ponle un nombre a la cuenta').max(30, 'Usa máximo 30 caracteres'),
    type: z.enum(ACCOUNT_TYPES),
    initialBalance: amountText('Ingresa el saldo inicial (puede ser 0)'),
    isNegative: z.boolean(),
  })
  .transform(({ initialBalance, isNegative, ...rest }) => ({ ...rest, initialBalance: isNegative ? -initialBalance : initialBalance }));
export type AccountFormValues = z.input<typeof accountSchema>;
export type AccountFormOutput = z.output<typeof accountSchema>;
