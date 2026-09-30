import { z } from 'zod';

import { amountText, isoDateField, noteField } from '@/features/forms/fields';
import { BUDGET_GROUPS, CATEGORY_COLORS, CATEGORY_KINDS, RECURRING_FREQUENCIES } from '@/types/enums';

export const fixedExpenseSchema = z.object({
  name: z.string().trim().min(1, 'Ponle un nombre, ej.: Arriendo').max(40, 'Usa máximo 40 caracteres'),
  amount: amountText('Ingresa el monto', { positive: true }),
  categoryId: z.string().nullable(),
  accountId: z.string().nullable(),
  dueDay: z.number({ error: 'Ingresa el día de vencimiento' }).int().min(1, 'El día debe estar entre 1 y 31').max(31, 'El día debe estar entre 1 y 31'),
  frequency: z.enum(RECURRING_FREQUENCIES),
  startDate: isoDateField,
  active: z.boolean(),
  note: noteField,
});
export type FixedExpenseFormValues = z.input<typeof fixedExpenseSchema>;
export type FixedExpenseFormOutput = z.output<typeof fixedExpenseSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Ponle un nombre a la categoría').max(30, 'Usa máximo 30 caracteres'),
  kind: z.enum(CATEGORY_KINDS),
  icon: z.string().min(1, 'Elige un ícono'),
  color: z.enum(CATEGORY_COLORS),
  budgetGroup: z.enum(BUDGET_GROUPS).nullable(),
});
export type CategoryFormValues = z.input<typeof categorySchema>;
export type CategoryFormOutput = z.output<typeof categorySchema>;
