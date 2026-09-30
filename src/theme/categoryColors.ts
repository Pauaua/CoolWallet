import { CATEGORY_COLORS, type CategoryColor } from '@/types/enums';

import type { ColorScheme } from './ThemeProvider';

/**
 * Paleta de categorías y cuentas. En la base se guarda la CLAVE (ej. "forest"),
 * nunca el hex, para que cada una tenga su versión clara y oscura.
 */
const CATEGORY_PALETTE: Record<CategoryColor, { light: string; dark: string }> = {
  forest: { light: '#1F6F50', dark: '#4DB587' },
  emerald: { light: '#2E9E6B', dark: '#5CC896' },
  mint: { light: '#2A8C7A', dark: '#5BC2AE' },
  teal: { light: '#1F7A8C', dark: '#5AB4C6' },
  sage: { light: '#5E7A68', dark: '#9DB8A6' },
  olive: { light: '#6F7A2E', dark: '#B4BF6A' },
  amber: { light: '#A36F12', dark: '#E0B055' },
  clay: { light: '#A5562F', dark: '#E08E64' },
  rose: { light: '#B04A5A', dark: '#E88494' },
  plum: { light: '#7A4F8C', dark: '#BC93CE' },
  sky: { light: '#3D6BC4', dark: '#7FA0E6' },
  slate: { light: '#56636E', dark: '#A3AFB9' },
};

const FALLBACK: CategoryColor = 'sage';

function isCategoryColor(value: string): value is CategoryColor {
  return (CATEGORY_COLORS as readonly string[]).includes(value);
}

/** Color (hex) de una clave de paleta para el esquema actual. Claves desconocidas → "sage". */
export function resolveCategoryColor(key: string, scheme: ColorScheme): string {
  return CATEGORY_PALETTE[isCategoryColor(key) ? key : FALLBACK][scheme];
}
