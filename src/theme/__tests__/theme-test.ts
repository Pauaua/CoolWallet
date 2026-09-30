import { buildTheme, darkColors, lightColors, resolveCategoryColor, resolveScheme } from '..';

describe('resolveCategoryColor', () => {
  it('devuelve la variante del esquema', () => {
    expect(resolveCategoryColor('forest', 'light')).toBe('#1B7A50');
    expect(resolveCategoryColor('forest', 'dark')).toBe('#3FA877');
  });

  it('claves desconocidas usan el color neutro', () => {
    expect(resolveCategoryColor('no-existe', 'light')).toBe(resolveCategoryColor('sage', 'light'));
  });
});

describe('resolveScheme', () => {
  it('respeta la preferencia explícita', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });

  it('sigue al sistema cuando la preferencia es "system"', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', 'unspecified')).toBe('light');
  });
});

describe('buildTheme', () => {
  it('usa la paleta correspondiente al esquema', () => {
    expect(buildTheme('light').colors).toBe(lightColors);
    expect(buildTheme('dark').colors).toBe(darkColors);
  });

  it('claro y oscuro definen los mismos tokens', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('mantiene los colores base de la marca', () => {
    expect(lightColors.primary).toBe('#1F6F50');
    expect(lightColors.background).toBe('#F5F8F6');
    expect(darkColors.background).toBe('#0F1A15');
    expect(darkColors.surface).toBe('#16241D');
  });
});
