import { roundMoney } from './money';
import { DEFAULT_SALARY_PARAMS, type SalaryParams, type TaxBracket } from './params';

export type ContractType = 'dependiente' | 'honorarios';
export type ContractTerm = 'indefinite' | 'fixedTerm';
export type HealthSystem = 'fonasa' | 'isapre';

/** Base imponible: el bruto limitado por el tope (nunca negativa). */
function cappedBase(gross: number, cap: number): number {
  return Math.max(0, Math.min(gross, cap));
}

/**
 * Descuento AFP (cotización obligatoria + comisión) sobre la base imponible con tope.
 * @param gross Sueldo bruto imponible mensual.
 * @param afpRate Tasa total (ej.: 0.1144 = 10% + 1,44% de comisión).
 * @param topeImponible Tope imponible en pesos.
 */
export function calcAfpDiscount(gross: number, afpRate: number, topeImponible: number): number {
  return roundMoney(cappedBase(gross, topeImponible) * Math.max(0, afpRate));
}

export type HealthOptions = {
  /** Valor del plan Isapre en UF (solo Isapre). */
  isapreUf?: number;
  /** Valor de la UF en pesos (necesario para Isapre). */
  ufValue?: number;
  /** Tope imponible en pesos. Por defecto, sin tope. */
  topeImponible?: number;
  /** Tasa legal de salud. Por defecto 7%. */
  rate?: number;
};

/**
 * Descuento legal de salud: 7% de la base imponible con tope.
 * No se deduce del impuesto nada por encima de este monto.
 */
export function calcHealthLegalDiscount(gross: number, options: Omit<HealthOptions, 'isapreUf' | 'ufValue'> = {}): number {
  const { topeImponible = Infinity, rate = DEFAULT_SALARY_PARAMS.healthRate } = options;
  return roundMoney(cappedBase(gross, topeImponible) * rate);
}

/**
 * Descuento de salud.
 * - Fonasa: 7% de la base imponible.
 * - Isapre: el mayor entre el 7% y el valor del plan (UF × valor UF).
 */
export function calcHealthDiscount(gross: number, system: HealthSystem, options: HealthOptions = {}): number {
  const legal = calcHealthLegalDiscount(gross, options);
  if (system === 'fonasa') return legal;
  const { isapreUf = 0, ufValue = 0 } = options;
  const plan = roundMoney(Math.max(0, isapreUf) * Math.max(0, ufValue));
  return Math.max(legal, plan);
}

export type UnemploymentOptions = {
  term?: ContractTerm;
  /** Tope imponible del seguro de cesantía en pesos. Por defecto, sin tope. */
  topeImponible?: number;
  rates?: SalaryParams['unemploymentRates'];
};

/**
 * Aporte del trabajador al seguro de cesantía.
 * Honorarios no cotiza; plazo fijo es 0% para el trabajador.
 */
export function calcUnemploymentInsurance(
  gross: number,
  contractType: ContractType,
  options: UnemploymentOptions = {},
): number {
  if (contractType === 'honorarios') return 0;
  const { term = 'indefinite', topeImponible = Infinity, rates = DEFAULT_SALARY_PARAMS.unemploymentRates } = options;
  return roundMoney(cappedBase(gross, topeImponible) * rates[term]);
}

export type TaxDeductions = {
  afp: number;
  /** Solo la parte legal (7%) de salud es deducible. */
  health: number;
  unemployment: number;
};

/** Renta tributable = bruto − cotizaciones deducibles (nunca negativa). */
export function calcTaxableIncome(gross: number, discounts: TaxDeductions): number {
  return Math.max(0, roundMoney(gross - discounts.afp - discounts.health - discounts.unemployment));
}

/**
 * Impuesto único de segunda categoría (mensual), calculado por tramos marginales.
 * @param taxableIncome Renta tributable en pesos.
 * @param brackets Tramos en UTM, ordenados de menor a mayor.
 * @param utmValue Valor de la UTM en pesos.
 */
export function calcIncomeTax(taxableIncome: number, brackets: readonly TaxBracket[], utmValue: number): number {
  if (taxableIncome <= 0 || utmValue <= 0) return 0;
  let tax = 0;
  for (const bracket of brackets) {
    const from = bracket.fromUtm * utmValue;
    const to = bracket.toUtm === null ? Infinity : bracket.toUtm * utmValue;
    if (taxableIncome <= from) break;
    tax += (Math.min(taxableIncome, to) - from) * bracket.rate;
  }
  return roundMoney(tax);
}

/**
 * Líquido de una boleta de honorarios.
 * @param retentionRate Tasa de retención (ej.: 0.1525).
 */
export function calcHonorariosNet(gross: number, retentionRate: number): { retention: number; net: number } {
  const base = Math.max(0, gross);
  const retention = roundMoney(base * Math.max(0, retentionRate));
  return { retention, net: base - retention };
}

export type NetSalaryInput = {
  gross: number;
  contractType: ContractType;
  /** Solo dependiente. Por defecto indefinido. */
  contractTerm?: ContractTerm;
  /** Comisión de la AFP (ej.: 0.0144). Se suma a la cotización obligatoria. */
  afpCommissionRate: number;
  healthSystem: HealthSystem;
  /** Plan Isapre en UF. */
  isapreUf?: number;
  /** Si la persona cotiza seguro de cesantía. */
  hasUnemploymentInsurance: boolean;
};

export type NetSalaryBreakdown = {
  gross: number;
  /** Base imponible para AFP/salud (bruto con tope). */
  taxableBase: number;
  afp: number;
  health: number;
  unemployment: number;
  /** Renta tributable. */
  taxableIncome: number;
  incomeTax: number;
  /** Retención de honorarios (0 si es dependiente). */
  honorariosRetention: number;
  totalDiscounts: number;
  net: number;
};

/** Desglose completo del sueldo líquido. */
export function calcNetSalary(input: NetSalaryInput, params: SalaryParams = DEFAULT_SALARY_PARAMS): NetSalaryBreakdown {
  const gross = Math.max(0, input.gross);

  if (input.contractType === 'honorarios') {
    const { retention, net } = calcHonorariosNet(gross, params.honorariosRetentionRate);
    return {
      gross,
      taxableBase: 0,
      afp: 0,
      health: 0,
      unemployment: 0,
      taxableIncome: 0,
      incomeTax: 0,
      honorariosRetention: retention,
      totalDiscounts: retention,
      net,
    };
  }

  const { ufValue, utmValue } = params.indicators;
  const pensionCap = params.capsUf.pensionAndHealth * ufValue;
  const unemploymentCap = params.capsUf.unemployment * ufValue;

  const afp = calcAfpDiscount(gross, params.afpMandatoryRate + input.afpCommissionRate, pensionCap);
  const healthOptions = { topeImponible: pensionCap, rate: params.healthRate };
  const health = calcHealthDiscount(gross, input.healthSystem, { ...healthOptions, isapreUf: input.isapreUf, ufValue });
  const healthDeductible = calcHealthLegalDiscount(gross, healthOptions);
  const unemployment = input.hasUnemploymentInsurance
    ? calcUnemploymentInsurance(gross, 'dependiente', {
        term: input.contractTerm,
        topeImponible: unemploymentCap,
        rates: params.unemploymentRates,
      })
    : 0;

  const taxableIncome = calcTaxableIncome(gross, { afp, health: healthDeductible, unemployment });
  const incomeTax = calcIncomeTax(taxableIncome, params.brackets, utmValue);
  const totalDiscounts = afp + health + unemployment + incomeTax;

  return {
    gross,
    taxableBase: roundMoney(cappedBase(gross, pensionCap)),
    afp,
    health,
    unemployment,
    taxableIncome,
    incomeTax,
    honorariosRetention: 0,
    totalDiscounts,
    net: gross - totalDiscounts,
  };
}
