import { buildHistoryFilter, getHistoryRange } from '../historyFilters';

describe('getHistoryRange', () => {
  it('usa meses financieros desde el día de pago', () => {
    expect(getHistoryRange('period', '2026-09-30', 25, 'payday')).toEqual({ from: '2026-09-25', to: '2026-10-24' });
    expect(getHistoryRange('previous', '2026-09-30', 25, 'payday')).toEqual({ from: '2026-08-25', to: '2026-09-24' });
    expect(getHistoryRange('last3', '2026-09-30', 25, 'payday')).toEqual({ from: '2026-07-25', to: '2026-10-24' });
    expect(getHistoryRange('all', '2026-09-30', 25, 'payday')).toEqual({});
  });

  it('modo calendario', () => {
    expect(getHistoryRange('last3', '2026-03-15', 25, 'calendar')).toEqual({ from: '2026-01-01', to: '2026-03-31' });
  });
});

describe('buildHistoryFilter', () => {
  const base = { today: '2026-09-30', payDay: 1, mode: 'calendar' as const };

  it('combina rango, tipo y categoría', () => {
    expect(buildHistoryFilter({ ...base, preset: 'period', type: 'expenses', categoryId: 'coffee' })).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
      types: ['fixed_expense', 'ant_expense'],
      categoryIds: ['coffee'],
    });
  });

  it('sin filtros de tipo ni categoría', () => {
    expect(buildHistoryFilter({ ...base, preset: 'all', type: 'all', categoryId: null })).toEqual({ types: undefined, categoryIds: undefined });
  });
});
