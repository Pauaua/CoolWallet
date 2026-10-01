import { calcNetSalary, DEFAULT_SALARY_PARAMS, sumAmounts, type NetSalaryBreakdown, type NetSalaryInput, type SalaryParams } from '@/lib/finance';
import type { Profile, Settings } from '@/types/models';

/** Parámetros de sueldo con la UF/UTM que la persona haya editado (o los valores por defecto). */
export function buildSalaryParams(settings: Pick<Settings, 'ufValue' | 'utmValue' | 'indicatorsAsOf'> | null | undefined): SalaryParams {
  const defaults = DEFAULT_SALARY_PARAMS.indicators;
  return {
    ...DEFAULT_SALARY_PARAMS,
    indicators: {
      ufValue: settings?.ufValue ?? defaults.ufValue,
      utmValue: settings?.utmValue ?? defaults.utmValue,
      asOf: settings?.indicatorsAsOf ?? defaults.asOf,
    },
  };
}

export function toNetSalaryInput(profile: Profile): NetSalaryInput {
  return {
    gross: profile.grossSalary,
    contractType: profile.contractType,
    contractTerm: profile.contractTerm,
    afpCommissionRate: profile.afpCommissionRate,
    healthSystem: profile.healthSystem,
    isapreUf: profile.isapreUf ?? undefined,
    hasUnemploymentInsurance: profile.hasUnemploymentInsurance,
  };
}

/** Desglose del sueldo líquido del perfil. */
export function computeNetSalary(profile: Profile, settings: Settings | null | undefined): NetSalaryBreakdown {
  return calcNetSalary(toNetSalaryInput(profile), buildSalaryParams(settings));
}

/** Ingreso líquido mensual esperado: sueldo líquido + otros ingresos recurrentes. */
export function computeMonthlyNetIncome(profile: Profile, settings: Settings | null | undefined): number {
  return sumAmounts([computeNetSalary(profile, settings).net, profile.otherIncome]);
}
