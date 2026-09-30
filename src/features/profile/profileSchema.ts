import { z } from 'zod';

import { formatAmountInput, formatDecimalInput, parseCLPInput, parseDecimalInput } from '@/lib/finance';
import { CONTRACT_TERMS, CONTRACT_TYPES, HEALTH_SYSTEMS } from '@/types/enums';
import type { Profile, ProfileInput } from '@/types/models';

const MAX_AMOUNT = 1_000_000_000;

/** Monto en texto ("1.200.000") → pesos enteros ≥ 0. */
const amountText = (requiredMessage: string) =>
  z
    .string()
    .transform((text) => parseCLPInput(text))
    .pipe(
      z
        .number({ error: requiredMessage })
        .int()
        .min(0, 'El monto no puede ser negativo')
        .max(MAX_AMOUNT, 'Revisa el monto: es demasiado alto'),
    );

export const nameSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa tu nombre').max(40, 'Usa máximo 40 caracteres'),
});

/** Datos financieros base. Los montos y decimales llegan como texto desde los inputs. */
export const salarySchema = z
  .object({
    grossSalary: amountText('Ingresa tu sueldo bruto (puede ser 0)'),
    payDay: z.number({ error: 'Elige tu día de pago' }).int().min(1, 'El día debe estar entre 1 y 31').max(31, 'El día debe estar entre 1 y 31'),
    contractType: z.enum(CONTRACT_TYPES),
    contractTerm: z.enum(CONTRACT_TERMS),
    afpName: z.string().nullable(),
    /** Comisión AFP en % ("1,44"). */
    afpCommissionPercent: z
      .string()
      .transform((text) => (text.trim() === '' ? 0 : parseDecimalInput(text)))
      .pipe(z.number({ error: 'Ingresa la comisión como número, ej.: 1,44' }).min(0, 'La comisión no puede ser negativa').max(5, 'Revisa la comisión: máximo 5%')),
    healthSystem: z.enum(HEALTH_SYSTEMS),
    /** Plan Isapre en UF ("3,5"). */
    isapreUfText: z
      .string()
      // Vacío = sin plan (null); texto inválido = NaN para que falle con el mensaje de formato.
      .transform((text) => (text.trim() === '' ? null : (parseDecimalInput(text) ?? NaN)))
      .pipe(z.number({ error: 'Ingresa el plan en UF, ej.: 3,5' }).min(0, 'El plan no puede ser negativo').max(100, 'Revisa el valor del plan').nullable()),
    hasUnemploymentInsurance: z.boolean(),
    otherIncome: amountText('Ingresa otros ingresos (puede ser 0)'),
  })
  .superRefine((values, ctx) => {
    if (values.contractType === 'dependiente' && !values.afpName) {
      ctx.addIssue({ code: 'custom', path: ['afpName'], message: 'Elige tu AFP' });
    }
    if (values.contractType === 'dependiente' && values.healthSystem === 'isapre' && !values.isapreUfText) {
      ctx.addIssue({ code: 'custom', path: ['isapreUfText'], message: 'Ingresa el valor de tu plan en UF' });
    }
  });

export const profileSchema = z.intersection(nameSchema, salarySchema);

export type NameFormValues = z.input<typeof nameSchema>;
export type SalaryFormValues = z.input<typeof salarySchema>;
export type SalaryFormOutput = z.output<typeof salarySchema>;
export type ProfileFormValues = z.input<typeof profileSchema>;
export type ProfileFormOutput = z.output<typeof profileSchema>;

/** Valores iniciales del formulario de sueldo (vacío o desde un perfil guardado). */
export function toSalaryFormValues(profile?: Profile | null): SalaryFormValues {
  return {
    grossSalary: profile ? formatAmountInput(profile.grossSalary) : '',
    payDay: profile?.payDay ?? 1,
    contractType: profile?.contractType ?? 'dependiente',
    contractTerm: profile?.contractTerm ?? 'indefinite',
    afpName: profile?.afpName ?? null,
    afpCommissionPercent: profile ? formatDecimalInput(profile.afpCommissionRate * 100) : '',
    healthSystem: profile?.healthSystem ?? 'fonasa',
    isapreUfText: formatDecimalInput(profile?.isapreUf),
    hasUnemploymentInsurance: profile?.hasUnemploymentInsurance ?? true,
    otherIncome: profile ? formatAmountInput(profile.otherIncome) : '0',
  };
}

/** Convierte la salida validada al formato del repositorio. */
export function toProfileInput(name: string, salary: SalaryFormOutput, photoUri: string | null): ProfileInput {
  const isDependiente = salary.contractType === 'dependiente';
  return {
    name,
    photoUri,
    grossSalary: salary.grossSalary,
    payDay: salary.payDay,
    contractType: salary.contractType,
    contractTerm: salary.contractTerm,
    afpName: isDependiente ? salary.afpName : null,
    afpCommissionRate: isDependiente ? salary.afpCommissionPercent / 100 : 0,
    healthSystem: salary.healthSystem,
    isapreUf: isDependiente && salary.healthSystem === 'isapre' ? salary.isapreUfText : null,
    hasUnemploymentInsurance: isDependiente && salary.hasUnemploymentInsurance,
    otherIncome: salary.otherIncome,
  };
}
