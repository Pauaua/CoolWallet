import { formatCLP, formatPercent, parseCLPInput } from '../format';
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
