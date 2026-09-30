/**
 * Devuelve hasta dos iniciales en mayúscula a partir de un nombre.
 * Ej.: "María José Pérez" → "MP"; "ana" → "A"; "" → "".
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  if (!first) return '';
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  return (first.charAt(0) + (last ? last.charAt(0) : '')).toLocaleUpperCase('es-CL');
}
