const integerFormatter = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

/**
 * Formatea pesos chilenos: `1234567` → `"$1.234.567"`, `-1234` → `"-$1.234"`.
 * Redondea a pesos enteros. El signo se antepone a mano para que el
 * resultado sea igual en todos los motores de JavaScript.
 */
export function formatCLP(amount: number): string {
  const rounded = Math.round(amount) || 0;
  const sign = rounded < 0 ? '-' : '';
  return `${sign}$${integerFormatter.format(Math.abs(rounded))}`;
}

/**
 * Convierte el texto de un input de monto a pesos enteros.
 * Acepta `$`, espacios y puntos de miles (`"$1.234.567"` → `1234567`).
 * Si trae decimales con coma, se redondean (`"1.234,6"` → `1235`).
 * @returns El monto, o `null` si el texto está vacío o no es un número.
 */
export function parseCLPInput(text: string): number | null {
  const cleaned = text.replace(/[\s$]/g, '').replace(/\./g, '');
  if (!/^-?\d+(,\d*)?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned.replace(',', '.'))) || 0;
}

/**
 * Convierte el texto de un input decimal (UF, porcentajes) a número.
 * Acepta coma decimal (`"1,44"`), punto decimal si no hay coma (`"1.44"`)
 * y puntos de miles cuando hay coma (`"1.234,5"`).
 * @returns El número, o `null` si el texto está vacío o no es válido.
 */
export function parseDecimalInput(text: string): number | null {
  const compact = text.replace(/\s/g, '');
  const normalized = compact.includes(',') ? compact.replace(/\./g, '').replace(',', '.') : compact;
  if (!/^-?\d+(\.\d*)?$/.test(normalized)) return null;
  return Number(normalized);
}

/** Muestra un decimal para editarlo en un input: `1.44` → `"1,44"` (sin separador de miles). */
export function formatDecimalInput(value: number | null | undefined, maxDecimals = 4): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: maxDecimals, useGrouping: false }).format(value);
}

/** Muestra un monto para editarlo en un input: `1234567` → `"1.234.567"`; `null` → `""`. */
export function formatAmountInput(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return integerFormatter.format(Math.round(value));
}

/**
 * Formatea un porcentaje en estilo chileno: `23.456` → `"23%"`, con 1 decimal `"23,5%"`.
 * `null` (porcentaje no calculable) → `"—"`.
 */
export function formatPercent(value: number | null, decimals = 0): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const factor = 10 ** decimals;
  // Evita "-0%" cuando un valor negativo muy chico se redondea a cero.
  const rounded = Math.round(value * factor) / factor || 0;
  const formatted = new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rounded);
  return `${formatted}%`;
}

/** Monto abreviado para ejes de gráficos: 1.250.000 → "$1,3 M", 450.000 → "$450 mil", 900 → "$900". */
export function formatCompactCLP(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(Math.round(amount));
  const oneDecimal = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });
  if (abs >= 1_000_000) return `${sign}$${oneDecimal.format(abs / 1_000_000)} M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)} mil`;
  return `${sign}$${abs}`;
}
