import { formatAmountInput, formatCLP, formatCompactCLP, formatDecimalInput, formatPercent, parseCLPInput, parseDecimalInput } from '../format';
import { ceilMoney, floorMoney, percentageOf, roundMoney, sumAmounts } from '../money';
import { DEFAULT_INDICATORS, staticIndicatorsSource } from '../params';

describe('formatCLP', () => {
  it.each([
    [0, '$0'],
    [5, '$5'],
    [999, '$999'],
    [1_234, '$1.234'],
    [1_234_567, '$1.234.567'],
    [-1_234, '-$1.234'],
    [1_234.5, '$1.235'],
    [-0.4, '$0'],
  ])('%d → %s', (amount, expected) => {
    expect(formatCLP(amount)).toBe(expected);
  });
});

describe('parseCLPInput', () => {
  it.each([
    ['$1.234.567', 1_234_567],
    [' 2.500 ', 2_500],
    ['2500', 2_500],
    ['1234,6', 1_235],
    ['12,', 12],
    ['-500', -500],
    ['0', 0],
  ])('"%s" → %d', (text, expected) => {
    expect(parseCLPInput(text)).toBe(expected);
  });

  it.each(['', '   ', '$', 'abc', '12a', '1,2,3', '--5'])('"%s" → null', (text) => {
    expect(parseCLPInput(text)).toBeNull();
  });
});

describe('parseDecimalInput', () => {
  it.each([
    ['1,44', 1.44],
    ['1.44', 1.44],
    ['3', 3],
    [' 2,5 ', 2.5],
    ['1.234,5', 1234.5],
    ['0,58', 0.58],
    ['-1,5', -1.5],
    ['7,', 7],
  ])('"%s" → %d', (text, expected) => {
    expect(parseDecimalInput(text)).toBe(expected);
  });

  it.each(['', 'abc', '1,2,3', '1.2.3', ',5'])('"%s" → null', (text) => {
    expect(parseDecimalInput(text)).toBeNull();
  });
});

describe('formatDecimalInput / formatAmountInput', () => {
  it('formatea para editar', () => {
    expect(formatDecimalInput(1.44)).toBe('1,44');
    expect(formatDecimalInput(1234.5)).toBe('1234,5');
    expect(formatDecimalInput(0.123456, 2)).toBe('0,12');
    expect(formatAmountInput(1_234_567)).toBe('1.234.567');
    expect(formatAmountInput(0)).toBe('0');
  });

  it('valores vacíos quedan en blanco', () => {
    expect(formatDecimalInput(null)).toBe('');
    expect(formatDecimalInput(undefined)).toBe('');
    expect(formatDecimalInput(NaN)).toBe('');
    expect(formatAmountInput(null)).toBe('');
    expect(formatAmountInput(undefined)).toBe('');
    expect(formatAmountInput(Infinity)).toBe('');
  });
});

describe('formatPercent', () => {
  it('formatea con coma decimal', () => {
    expect(formatPercent(23.456)).toBe('23%');
    expect(formatPercent(23.456, 1)).toBe('23,5%');
    expect(formatPercent(150)).toBe('150%');
  });

  it('evita "-0%"', () => {
    expect(formatPercent(-0.2)).toBe('0%');
  });

  it('sin valor muestra una raya', () => {
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(Infinity)).toBe('—');
  });
});

describe('money', () => {
  it('redondeos normalizan -0', () => {
    expect(Object.is(roundMoney(-0.4), 0)).toBe(true);
    expect(roundMoney(2.5)).toBe(3);
    expect(floorMoney(2.9)).toBe(2);
    expect(Object.is(ceilMoney(-0.5), 0)).toBe(true);
    expect(ceilMoney(2.1)).toBe(3);
  });

  it('sumAmounts y percentageOf', () => {
    expect(sumAmounts([1, 2, 3])).toBe(6);
    expect(sumAmounts([])).toBe(0);
    expect(percentageOf(1, 4)).toBe(25);
    expect(percentageOf(1, 0)).toBeNull();
  });
});

describe('params', () => {
  it('la fuente estática devuelve los indicadores por defecto (sin red)', async () => {
    await expect(staticIndicatorsSource.getLatest()).resolves.toEqual(DEFAULT_INDICATORS);
  });
});

describe('formatCompactCLP', () => {
  it.each([
    [1_250_000, '$1,3 M'],
    [2_000_000, '$2 M'],
    [450_000, '$450 mil'],
    [1_499, '$1 mil'],
    [900, '$900'],
    [0, '$0'],
    [-75_000, '-$75 mil'],
  ])('%d → %s', (amount, expected) => {
    expect(formatCompactCLP(amount)).toBe(expected);
  });
});
