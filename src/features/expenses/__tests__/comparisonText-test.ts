import { describeComparison } from '../comparisonText';

describe('describeComparison', () => {
  it('describe alzas y bajas con porcentaje y monto', () => {
    expect(describeComparison({ difference: 6_900, percentage: 23, trend: 'up' })).toBe('23% más que el mes anterior (+$6.900)');
    expect(describeComparison({ difference: -5_000, percentage: -10, trend: 'down' })).toBe('10% menos que el mes anterior (−$5.000)');
  });

  it('sin cambios o sin mes anterior', () => {
    expect(describeComparison({ difference: 0, percentage: 0, trend: 'equal' })).toBe('Igual que el mes anterior');
    expect(describeComparison({ difference: 5_000, percentage: null, trend: 'up' })).toBe('Sin gastos el mes anterior');
    expect(describeComparison({ difference: 0, percentage: null, trend: 'equal' })).toBe('Sin gastos este mes ni el anterior');
  });
});
