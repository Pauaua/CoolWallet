/**
 * Parámetros legales y económicos de Chile usados en los cálculos.
 *
 * ⚠️ VALORES APROXIMADOS — fecha de referencia: septiembre de 2026.
 * No son definitivos: la UI debe mostrar una nota para que la persona los
 * verifique (SII, Superintendencia de Pensiones, mindicador.cl). Todos son
 * editables y los cálculos los reciben como argumento, nunca los leen "ocultos".
 */

export const PARAMS_REFERENCE_DATE = '2026-09-01';

export const PARAMS_DISCLAIMER =
  'Los valores legales (UF, UTM, topes, tasas y tramos) son aproximados. Verifícalos antes de tomar decisiones.';

/** Valores de indicadores económicos en pesos. */
export type EconomicIndicators = {
  ufValue: number;
  utmValue: number;
  /** Fecha (ISO) a la que corresponden los valores. */
  asOf: string;
};

/** Valores por defecto (aproximados) para usar sin conexión. */
export const DEFAULT_INDICATORS: EconomicIndicators = {
  ufValue: 40_300,
  utmValue: 70_500,
  asOf: PARAMS_REFERENCE_DATE,
};

/**
 * Punto de extensión para actualizar UF/UTM desde una API en el futuro
 * (ej.: https://mindicador.cl/api). La app es offline: hoy solo existe la
 * fuente estática y los valores que la persona edite a mano.
 */
export interface IndicatorsSource {
  getLatest(): Promise<EconomicIndicators>;
}

export const staticIndicatorsSource: IndicatorsSource = {
  getLatest: async () => DEFAULT_INDICATORS,
};

/** Tramo mensual del impuesto único de segunda categoría, en UTM. */
export type TaxBracket = {
  /** Límite inferior del tramo (UTM, exclusivo salvo el primero). */
  fromUtm: number;
  /** Límite superior del tramo (UTM, inclusivo). `null` = sin tope. */
  toUtm: number | null;
  /** Tasa marginal del tramo (0.04 = 4%). */
  rate: number;
};

/** Tabla mensual del impuesto único (vigente desde 2023, en UTM). */
export const INCOME_TAX_BRACKETS: readonly TaxBracket[] = [
  { fromUtm: 0, toUtm: 13.5, rate: 0 },
  { fromUtm: 13.5, toUtm: 30, rate: 0.04 },
  { fromUtm: 30, toUtm: 50, rate: 0.08 },
  { fromUtm: 50, toUtm: 70, rate: 0.135 },
  { fromUtm: 70, toUtm: 90, rate: 0.23 },
  { fromUtm: 90, toUtm: 120, rate: 0.304 },
  { fromUtm: 120, toUtm: 310, rate: 0.35 },
  { fromUtm: 310, toUtm: null, rate: 0.4 },
];

/** Cotización obligatoria AFP (sin comisión). */
export const AFP_MANDATORY_RATE = 0.1;

/** Comisiones AFP aproximadas (sobre la remuneración imponible). Editables en el perfil. */
export const AFP_COMMISSIONS: Readonly<Record<string, number>> = {
  Capital: 0.0144,
  Cuprum: 0.0144,
  Habitat: 0.0127,
  Modelo: 0.0058,
  PlanVital: 0.0116,
  Provida: 0.0145,
  Uno: 0.0046,
};

/** Cotización legal de salud (Fonasa, o mínimo en Isapre). */
export const HEALTH_RATE = 0.07;

/** Seguro de cesantía, aporte del trabajador. */
export const UNEMPLOYMENT_RATES = {
  /** Contrato indefinido: 0,6% de cargo del trabajador. */
  indefinite: 0.006,
  /** Contrato a plazo fijo: 0% del trabajador (lo paga el empleador). */
  fixedTerm: 0,
} as const;

/** Topes imponibles mensuales en UF. */
export const TAXABLE_CAPS_UF = {
  /** Tope para AFP y salud. */
  pensionAndHealth: 89.9,
  /** Tope para seguro de cesantía. */
  unemployment: 135.1,
} as const;

/** Retención de boletas de honorarios (2026: 15,25%; sube gradualmente hasta 17% en 2028). */
export const HONORARIOS_RETENTION_RATE = 0.1525;

/** Parámetros que necesita el cálculo de sueldo. */
export type SalaryParams = {
  indicators: EconomicIndicators;
  brackets: readonly TaxBracket[];
  afpMandatoryRate: number;
  healthRate: number;
  unemploymentRates: { indefinite: number; fixedTerm: number };
  capsUf: { pensionAndHealth: number; unemployment: number };
  honorariosRetentionRate: number;
};

export const DEFAULT_SALARY_PARAMS: SalaryParams = {
  indicators: DEFAULT_INDICATORS,
  brackets: INCOME_TAX_BRACKETS,
  afpMandatoryRate: AFP_MANDATORY_RATE,
  healthRate: HEALTH_RATE,
  unemploymentRates: UNEMPLOYMENT_RATES,
  capsUf: TAXABLE_CAPS_UF,
  honorariosRetentionRate: HONORARIOS_RETENTION_RATE,
};

/** Umbrales del semáforo deuda/ingreso (en %). */
export const DEBT_RATIO_THRESHOLDS = { medium: 30, high: 40 } as const;

/** Umbrales de alerta de presupuesto (en %). */
export const BUDGET_ALERT_THRESHOLDS = { warning: 80, exceeded: 100 } as const;

/** Días de anticipación para marcar una deuda "por vencer". */
export const DEBT_DUE_SOON_DAYS = 5;
