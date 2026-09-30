import { z } from 'zod';

import { amountText } from '@/features/forms/fields';

/** Valores de UF y UTM editados a mano (en pesos). */
export const indicatorsSchema = z.object({
  ufValue: amountText('Ingresa el valor de la UF', { positive: true }),
  utmValue: amountText('Ingresa el valor de la UTM', { positive: true }),
});
export type IndicatorsFormValues = z.input<typeof indicatorsSchema>;
export type IndicatorsFormOutput = z.output<typeof indicatorsSchema>;
