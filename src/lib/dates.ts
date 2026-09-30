import { differenceInCalendarDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { parseIsoDate, type IsoDate } from './finance';

/** "30 sep" (sin año). */
export function formatShortDate(date: IsoDate | Date): string {
  return format(parseIsoDate(date), 'd MMM', { locale: es }).replace('.', '');
}

/** "30 de septiembre de 2026". */
export function formatLongDate(date: IsoDate | Date): string {
  return format(parseIsoDate(date), "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** "Hoy", "Ayer" o "lun 28 sep" para agrupar movimientos. */
export function formatRelativeDay(date: IsoDate, today: IsoDate | Date): string {
  const diff = differenceInCalendarDays(parseIsoDate(today), parseIsoDate(date));
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return format(parseIsoDate(date), 'EEE d MMM', { locale: es }).replace(/\./g, '');
}

/** Rango de un período: "25 sep – 24 oct". */
export function formatPeriodRange(start: IsoDate, end: IsoDate): string {
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}
