import { formatCountdown } from '../formatCountdown';

describe('formatCountdown', () => {
  it('formatea minutos y segundos, redondeando hacia arriba', () => {
    expect(formatCountdown(75_000)).toBe('1:15');
    expect(formatCountdown(30_000)).toBe('0:30');
    expect(formatCountdown(29_001)).toBe('0:30');
    expect(formatCountdown(15 * 60_000)).toBe('15:00');
  });

  it('nunca es negativo', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-5_000)).toBe('0:00');
  });
});
