import { addMonths, differenceInCalendarDays, format, getDaysInMonth, isValid, parseISO, subDays } from 'date-fns';

/**
 * Fecha sin hora en formato `yyyy-MM-dd` (hora local). Es el formato de las
 * fechas "de calendario" (fecha de un gasto, vencimientos, metas).
 */
export type IsoDate = string;

export type PeriodMode = 'calendar' | 'payday';

export type FinancialPeriod = {
  /** Primer día del período (inclusive). */
  start: IsoDate;
  /** Último día del período (inclusive). */
  end: IsoDate;
  daysInPeriod: number;
};

/** Convierte un `Date` a `yyyy-MM-dd` en hora local. */
export function toIsoDate(date: Date): IsoDate {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Interpreta una fecha ISO (con o sin hora) como fecha local sin hora.
 * Solo se usan los primeros 10 caracteres para evitar corrimientos por zona horaria.
 */
export function parseIsoDate(value: IsoDate | Date): Date {
  if (value instanceof Date) return parseISO(toIsoDate(value));
  const date = parseISO(value.slice(0, 10));
  if (!isValid(date)) throw new Error(`Fecha inválida: ${value}`);
  return date;
}

/** Día del mes efectivo: si el mes es más corto, se usa el último día (ej.: 31 → 28 en febrero). */
export function clampDayToMonth(year: number, monthIndex: number, day: number): number {
  const days = getDaysInMonth(new Date(year, monthIndex, 1));
  return Math.min(Math.max(1, Math.trunc(day)), days);
}

/** Fecha con el día `day` (ajustado al largo del mes) en el mes de `reference`. */
export function dateWithDay(reference: Date, day: number): Date {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  return new Date(year, month, clampDayToMonth(year, month, day));
}

/**
 * Mes financiero que contiene `date`.
 * - `calendar`: del día 1 al último día del mes.
 * - `payday`: desde el día de pago hasta el día anterior al siguiente pago.
 * @param payDay Día de pago (1–31). Se ajusta en meses más cortos.
 */
export function getFinancialPeriod(date: IsoDate | Date, payDay: number, mode: PeriodMode): FinancialPeriod {
  const day = parseIsoDate(date);
  const effectivePayDay = mode === 'calendar' ? 1 : payDay;

  const payThisMonth = dateWithDay(day, effectivePayDay);
  const start = day >= payThisMonth ? payThisMonth : dateWithDay(addMonths(dateWithDay(day, 1), -1), effectivePayDay);
  const nextStart = dateWithDay(addMonths(dateWithDay(start, 1), 1), effectivePayDay);
  const end = subDays(nextStart, 1);

  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
    daysInPeriod: differenceInCalendarDays(end, start) + 1,
  };
}

/** Período inmediatamente anterior a `period`. */
export function getPreviousPeriod(period: FinancialPeriod, payDay: number, mode: PeriodMode): FinancialPeriod {
  return getFinancialPeriod(subDays(parseIsoDate(period.start), 1), payDay, mode);
}

/** Si una fecha (ISO, con o sin hora) cae dentro del período (inclusive). */
export function isDateInPeriod(date: IsoDate, period: FinancialPeriod): boolean {
  const day = date.slice(0, 10);
  return day >= period.start && day <= period.end;
}

/**
 * Días transcurridos del período, contando hoy (0 si aún no empieza,
 * `daysInPeriod` si ya terminó).
 */
export function getDaysElapsed(period: FinancialPeriod, today: IsoDate | Date): number {
  const elapsed = differenceInCalendarDays(parseIsoDate(today), parseIsoDate(period.start)) + 1;
  return Math.min(Math.max(0, elapsed), period.daysInPeriod);
}

/**
 * Días que quedan del período, contando hoy (`daysInPeriod` si aún no empieza,
 * 0 si ya terminó).
 */
export function getDaysRemaining(period: FinancialPeriod, today: IsoDate | Date): number {
  const remaining = differenceInCalendarDays(parseIsoDate(period.end), parseIsoDate(today)) + 1;
  return Math.min(Math.max(0, remaining), period.daysInPeriod);
}
