import { z } from 'zod';

import { amountText } from '@/features/forms/fields';
import { CATEGORY_COLORS } from '@/types/enums';

export const goalSchema = z.object({
  name: z.string().trim().min(1, 'Ponle un nombre, ej.: Vacaciones').max(40, 'Usa máximo 40 caracteres'),
  targetAmount: amountText('Ingresa cuánto quieres juntar', { positive: true }),
  savedAmount: amountText('Ingresa cuánto llevas (puede ser 0)'),
  /** Vacío = sin fecha objetivo. */
  targetDate: z.string().refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Elige una fecha válida'),
  icon: z.string().min(1),
  color: z.enum(CATEGORY_COLORS),
});
export type GoalFormValues = z.input<typeof goalSchema>;
export type GoalFormOutput = z.output<typeof goalSchema>;

export const contributionSchema = z.object({
  amount: amountText('Ingresa el monto', { positive: true }),
  direction: z.enum(['add', 'withdraw']),
});
export type ContributionFormValues = z.input<typeof contributionSchema>;
export type ContributionFormOutput = z.output<typeof contributionSchema>;
