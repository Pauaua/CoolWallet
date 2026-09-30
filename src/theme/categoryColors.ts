import { CATEGORY_COLORS, type CategoryColor } from '@/types/enums';

import type { ColorScheme } from './ThemeProvider';

/**
 * Paleta de categorías y cuentas. En la base se guarda la CLAVE (ej. "forest"),
 * nunca el hex, para que cada una tenga su versión clara y oscura.
 *
 * Los 10 tonos con color pasan el validador de paletas (banda de luminosidad y
 * croma) en claro y oscuro. Como la persona elige el color de cada categoría,
 * no se puede garantizar la separación entre vecinos en un gráfico: por eso los
 * gráficos siempre llevan etiqueta directa (nombre, monto y %) además del color.
 */
const CATEGORY_PALETTE: Record<CategoryColor, { light: string; dark: string }> = {
  forest: { light: '#1B7A50', dark: '#3FA877' },
  emerald: { light: '#1E9A60', dark: '#36A86F' },
  mint: { light: '#008A78', dark: '#26A08E' },
  teal: { light: '#1F7FB5', dark: '#3F92C8' },
  olive: { light: '#6F7A2E', dark: '#8C9A38' },
  amber: { light: '#A36F12', dark: '#BD8B2E' },
  clay: { light: '#A5562F', dark: '#CF7B50' },
  rose: { light: '#B04A5A', dark: '#D8707F' },
  plum: { light: '#7E4A96', dark: '#A97FC2' },
  sky: { light: '#3D6BC4', dark: '#6F90DB' },
  // Neutros a propósito (sin croma): para "Otros" o categorías secundarias.
  sage: { light: '#5E7A68', dark: '#8FA898' },
  slate: { light: '#56636E', dark: '#8E9AA4' },
};

const FALLBACK: CategoryColor = 'sage';

function isCategoryColor(value: string): value is CategoryColor {
  return (CATEGORY_COLORS as readonly string[]).includes(value);
}

/** Color (hex) de una clave de paleta para el esquema actual. Claves desconocidas → "sage". */
export function resolveCategoryColor(key: string, scheme: ColorScheme): string {
  return CATEGORY_PALETTE[isCategoryColor(key) ? key : FALLBACK][scheme];
}
