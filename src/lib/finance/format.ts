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
