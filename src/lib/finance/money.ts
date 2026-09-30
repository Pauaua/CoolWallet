/**
 * Reglas de redondeo del dinero (CLP, enteros en pesos).
 *
 * - Los cálculos trabajan con números sin redondear y redondean UNA vez al final.
 * - `roundMoney` (Math.round) es el redondeo por defecto.
 * - Cuando el resultado es un límite para gastar se usa `floorMoney` (nunca
 *   sugiere gastar de más) y cuando es un monto necesario para cumplir algo se
 *   usa `ceilMoney` (nunca se queda corto).
 */

/** Redondeo por defecto a pesos enteros. Normaliza `-0` a `0`. */
export function roundMoney(value: number): number {
  return Math.round(value) || 0;
}

/** Redondeo hacia abajo (límites de gasto). */
export function floorMoney(value: number): number {
  return Math.floor(value) || 0;
}

/** Redondeo hacia arriba (montos necesarios). */
export function ceilMoney(value: number): number {
  return Math.ceil(value) || 0;
}

/** Suma una lista de montos. */
export function sumAmounts(amounts: readonly number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}

/** Porcentaje `part / whole * 100`, o `null` si `whole` no es positivo. */
export function percentageOf(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return (part / whole) * 100;
}
