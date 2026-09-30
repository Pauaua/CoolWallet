import { shouldLockOnResume } from '../autoLock';

describe('shouldLockOnResume', () => {
  const start = 1_000_000;

  it('no bloquea si nunca pasó a segundo plano', () => {
    expect(shouldLockOnResume(null, start, 0)).toBe(false);
  });

  it('con 0 minutos bloquea siempre', () => {
    expect(shouldLockOnResume(start, start, 0)).toBe(true);
  });

  it('respeta el tiempo de gracia', () => {
    expect(shouldLockOnResume(start, start + 59_999, 1)).toBe(false);
    expect(shouldLockOnResume(start, start + 60_000, 1)).toBe(true);
  });

  it('trata minutos negativos como 0', () => {
    expect(shouldLockOnResume(start, start, -5)).toBe(true);
  });
});
