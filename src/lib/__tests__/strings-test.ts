import { getInitials } from '../strings';

describe('getInitials', () => {
  it('usa la primera letra del primer y último nombre', () => {
    expect(getInitials('María José Pérez')).toBe('MP');
  });

  it('funciona con un solo nombre y en minúsculas', () => {
    expect(getInitials('ana')).toBe('A');
  });

  it('ignora espacios extra', () => {
    expect(getInitials('  juan   soto  ')).toBe('JS');
  });

  it('devuelve vacío si no hay nombre', () => {
    expect(getInitials('')).toBe('');
    expect(getInitials('   ')).toBe('');
  });
});
