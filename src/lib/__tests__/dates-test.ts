import { formatLongDate, formatPeriodRange, formatRelativeDay, formatShortDate } from '../dates';

describe('formato de fechas en español', () => {
  it('fecha corta y larga', () => {
    expect(formatShortDate('2026-09-30')).toBe('30 sep');
    expect(formatLongDate('2026-09-30')).toBe('30 de septiembre de 2026');
  });

  it('día relativo', () => {
    expect(formatRelativeDay('2026-09-30', '2026-09-30')).toBe('Hoy');
    expect(formatRelativeDay('2026-09-29', '2026-09-30')).toBe('Ayer');
    expect(formatRelativeDay('2026-09-28', '2026-09-30')).toBe('lun 28 sep');
  });

  it('rango de período', () => {
    expect(formatPeriodRange('2026-09-25', '2026-10-24')).toBe('25 sep – 24 oct');
  });
});
