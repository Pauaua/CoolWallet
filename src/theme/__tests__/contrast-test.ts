import { darkColors, lightColors, type ColorTokens } from '../colors';
import { contrastRatio } from '../contrast';

/** AA: 4,5:1 para texto normal; 3:1 para elementos gráficos (íconos, bordes de foco, marcas de gráfico). */
const AA_TEXT = 4.5;
const AA_GRAPHIC = 3;

type Pair = [foreground: keyof ColorTokens, background: keyof ColorTokens];

/** Combinaciones de texto que usa la app (AppText sobre fondos y tarjetas, chips, botones). */
const TEXT_PAIRS: Pair[] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['textSecondary', 'background'],
  ['textSecondary', 'surface'],
  ['primary', 'background'],
  ['primary', 'surface'],
  ['primary', 'primarySoft'],
  ['text', 'primarySoft'],
  ['danger', 'background'],
  ['danger', 'surface'],
  ['warningText', 'background'],
  ['warningText', 'surface'],
  ['onPrimary', 'primary'],
  ['onPrimary', 'primaryDark'],
  ['onPrimary', 'danger'],
];

/** Elementos no textuales: barras de progreso, series de gráficos, bordes de foco. */
const GRAPHIC_PAIRS: Pair[] = [
  ['accent', 'surface'],
  ['warning', 'surface'],
  ['danger', 'surface'],
  ['chartIncome', 'surface'],
  ['chartExpense', 'surface'],
  ['chartDebt', 'surface'],
  ['primary', 'surface'],
];

describe.each([
  ['claro', lightColors],
  ['oscuro', darkColors],
])('contraste en modo %s', (_mode, colors) => {
  it.each(TEXT_PAIRS)('texto %s sobre %s cumple AA (4,5:1)', (foreground, background) => {
    expect(contrastRatio(colors[foreground], colors[background])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(GRAPHIC_PAIRS)('gráfico %s sobre %s cumple 3:1', (foreground, background) => {
    expect(contrastRatio(colors[foreground], colors[background])).toBeGreaterThanOrEqual(AA_GRAPHIC);
  });
});

describe('contrastRatio', () => {
  it('valores de referencia WCAG', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
    expect(() => contrastRatio('red', '#FFFFFF')).toThrow('Color no soportado');
  });
});
