import { DEFAULT_SALARY_PARAMS, INCOME_TAX_BRACKETS, type SalaryParams } from '../params';
import {
  calcAfpDiscount,
  calcHealthDiscount,
  calcHealthLegalDiscount,
  calcHonorariosNet,
  calcIncomeTax,
  calcNetSalary,
  calcTaxableIncome,
  calcUnemploymentInsurance,
  type NetSalaryInput,
} from '../salary';

const UTM = 70_000;
const params: SalaryParams = {
  ...DEFAULT_SALARY_PARAMS,
  indicators: { ufValue: 40_000, utmValue: UTM, asOf: '2026-09-01' },
};
// Topes con UF = 40.000: AFP/salud 89,9 UF = 3.596.000; cesantía 135,1 UF = 5.404.000.
const PENSION_CAP = 3_596_000;

const baseInput: NetSalaryInput = {
  gross: 1_000_000,
  contractType: 'dependiente',
  afpCommissionRate: 0.0144,
  healthSystem: 'fonasa',
  hasUnemploymentInsurance: true,
};

describe('calcAfpDiscount', () => {
  it('aplica la tasa total sobre el bruto', () => {
    expect(calcAfpDiscount(1_000_000, 0.1144, PENSION_CAP)).toBe(114_400);
  });

  it('respeta el tope imponible y redondea al final', () => {
    expect(calcAfpDiscount(5_000_000, 0.1144, PENSION_CAP)).toBe(411_382);
  });

  it('devuelve 0 con bruto cero o negativo, o tasa negativa', () => {
    expect(calcAfpDiscount(0, 0.1144, PENSION_CAP)).toBe(0);
    expect(calcAfpDiscount(-100, 0.1144, PENSION_CAP)).toBe(0);
    expect(calcAfpDiscount(1_000_000, -0.1, PENSION_CAP)).toBe(0);
  });
});

describe('calcHealthDiscount', () => {
  it('Fonasa descuenta 7%', () => {
    expect(calcHealthDiscount(1_000_000, 'fonasa')).toBe(70_000);
  });

  it('Isapre usa el plan cuando es mayor al 7%', () => {
    expect(calcHealthDiscount(1_000_000, 'isapre', { isapreUf: 3, ufValue: 40_000 })).toBe(120_000);
  });

  it('Isapre usa el 7% cuando el plan es menor', () => {
    expect(calcHealthDiscount(1_000_000, 'isapre', { isapreUf: 1, ufValue: 40_000 })).toBe(70_000);
  });

  it('Isapre sin datos del plan cae al 7%', () => {
    expect(calcHealthDiscount(1_000_000, 'isapre')).toBe(70_000);
  });

  it('respeta el tope imponible', () => {
    expect(calcHealthDiscount(5_000_000, 'fonasa', { topeImponible: PENSION_CAP })).toBe(251_720);
  });

  it('devuelve 0 sin sueldo', () => {
    expect(calcHealthDiscount(0, 'fonasa')).toBe(0);
    expect(calcHealthDiscount(-5, 'isapre', { isapreUf: -2, ufValue: 40_000 })).toBe(0);
  });
});

describe('calcHealthLegalDiscount', () => {
  it('usa la tasa indicada', () => {
    expect(calcHealthLegalDiscount(1_000_000, { rate: 0.05 })).toBe(50_000);
  });
});

describe('calcUnemploymentInsurance', () => {
  it('indefinido: 0,6% del trabajador', () => {
    expect(calcUnemploymentInsurance(1_000_000, 'dependiente')).toBe(6_000);
  });

  it('plazo fijo: 0% del trabajador', () => {
    expect(calcUnemploymentInsurance(1_000_000, 'dependiente', { term: 'fixedTerm' })).toBe(0);
  });

  it('honorarios no cotiza', () => {
    expect(calcUnemploymentInsurance(1_000_000, 'honorarios')).toBe(0);
  });

  it('respeta el tope imponible', () => {
    expect(calcUnemploymentInsurance(6_000_000, 'dependiente', { topeImponible: 5_404_000 })).toBe(32_424);
  });

  it('devuelve 0 con bruto negativo', () => {
    expect(calcUnemploymentInsurance(-1, 'dependiente')).toBe(0);
  });
});

describe('calcTaxableIncome', () => {
  it('resta las cotizaciones deducibles', () => {
    expect(calcTaxableIncome(1_000_000, { afp: 114_400, health: 70_000, unemployment: 6_000 })).toBe(809_600);
  });

  it('nunca es negativa', () => {
    expect(calcTaxableIncome(100, { afp: 200, health: 0, unemployment: 0 })).toBe(0);
  });
});

describe('calcIncomeTax', () => {
  it('está exento hasta 13,5 UTM', () => {
    expect(calcIncomeTax(809_600, INCOME_TAX_BRACKETS, UTM)).toBe(0);
    expect(calcIncomeTax(13.5 * UTM, INCOME_TAX_BRACKETS, UTM)).toBe(0);
  });

  // Valores esperados calculados con la fórmula del SII: renta × tasa − rebaja × UTM.
  it.each([
    [1_500_000, 22_200],
    [4_000_000, 225_700],
    [5_500_000, 485_200],
    [7_000_000, 882_000],
    [10_000_000, 1_867_600],
    [30_000_000, 9_282_600],
  ])('renta %i → impuesto %i', (taxable, expected) => {
    expect(calcIncomeTax(taxable, INCOME_TAX_BRACKETS, UTM)).toBe(expected);
  });

  it('devuelve 0 con renta o UTM no positivas', () => {
    expect(calcIncomeTax(0, INCOME_TAX_BRACKETS, UTM)).toBe(0);
    expect(calcIncomeTax(-1, INCOME_TAX_BRACKETS, UTM)).toBe(0);
    expect(calcIncomeTax(5_000_000, INCOME_TAX_BRACKETS, 0)).toBe(0);
  });
});

describe('calcHonorariosNet', () => {
  it('descuenta la retención', () => {
    expect(calcHonorariosNet(1_000_000, 0.1525)).toEqual({ retention: 152_500, net: 847_500 });
  });

  it('trata montos y tasas negativas como 0', () => {
    expect(calcHonorariosNet(-10, 0.1525)).toEqual({ retention: 0, net: 0 });
    expect(calcHonorariosNet(1_000, -0.1)).toEqual({ retention: 0, net: 1_000 });
  });
});

describe('calcNetSalary', () => {
  it('sueldo bajo, Fonasa, con cesantía: sin impuesto', () => {
    expect(calcNetSalary(baseInput, params)).toEqual({
      gross: 1_000_000,
      taxableBase: 1_000_000,
      afp: 114_400,
      health: 70_000,
      unemployment: 6_000,
      taxableIncome: 809_600,
      incomeTax: 0,
      honorariosRetention: 0,
      totalDiscounts: 190_400,
      net: 809_600,
    });
  });

  it('Isapre: el exceso sobre el 7% no rebaja el impuesto', () => {
    const result = calcNetSalary(
      { ...baseInput, gross: 2_000_000, afpCommissionRate: 0.0127, healthSystem: 'isapre', isapreUf: 4 },
      params,
    );
    expect(result.afp).toBe(225_400);
    expect(result.health).toBe(160_000);
    expect(result.unemployment).toBe(12_000);
    expect(result.taxableIncome).toBe(1_622_600);
    expect(result.incomeTax).toBe(27_104);
    expect(result.net).toBe(1_575_496);
  });

  it('sueldo alto: aplica topes imponibles', () => {
    const result = calcNetSalary({ ...baseInput, gross: 5_000_000 }, params);
    expect(result.taxableBase).toBe(PENSION_CAP);
    expect(result.afp).toBe(411_382);
    expect(result.health).toBe(251_720);
    expect(result.unemployment).toBe(30_000);
    expect(result.taxableIncome).toBe(4_306_898);
    expect(result.incomeTax).toBe(267_131);
    expect(result.net).toBe(4_039_767);
    expect(result.gross - result.totalDiscounts).toBe(result.net);
  });

  it('sin seguro de cesantía o a plazo fijo no descuenta cesantía', () => {
    expect(calcNetSalary({ ...baseInput, hasUnemploymentInsurance: false }, params).unemployment).toBe(0);
    expect(calcNetSalary({ ...baseInput, contractTerm: 'fixedTerm' }, params).unemployment).toBe(0);
  });

  it('honorarios: solo retención', () => {
    expect(calcNetSalary({ ...baseInput, contractType: 'honorarios' }, params)).toMatchObject({
      afp: 0,
      health: 0,
      incomeTax: 0,
      honorariosRetention: 152_500,
      totalDiscounts: 152_500,
      net: 847_500,
    });
  });

  it('bruto negativo da líquido 0', () => {
    const result = calcNetSalary({ ...baseInput, gross: -500 }, params);
    expect(result.net).toBe(0);
    expect(result.totalDiscounts).toBe(0);
  });

  it('usa los parámetros por defecto si no se indican', () => {
    const result = calcNetSalary({ ...baseInput, gross: 800_000 });
    expect(result.net).toBe(800_000 - result.totalDiscounts);
    expect(result.afp).toBe(91_520);
  });
});
