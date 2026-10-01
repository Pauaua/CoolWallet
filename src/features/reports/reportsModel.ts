import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { toFinanceDebt } from '@/features/debts/debtModel';
import {
  calcRemainingBalance,
  calcSavingsRate,
  filterByPeriod,
  getFinancialPeriod,
  getPreviousPeriod,
  parseIsoDate,
  summarizePeriodFlow,
  sumAmounts,
  type FinancialPeriod,
  type IsoDate,
  type PeriodMode,
} from '@/lib/finance';
import type { Debt, DebtPayment, Transaction } from '@/types/models';

export type MonthReport = {
  period: FinancialPeriod;
  /** Etiqueta corta del mes del período ("sep"). */
  label: string;
  income: number;
  expenses: number;
  debtPayments: number;
  /** (ingresos − gastos − pagos de deuda) / ingresos; `null` sin ingresos. */
  savingsRate: number | null;
  /** Deuda pendiente al cierre del período. */
  debtAtEnd: number;
};

/** Últimos `count` meses financieros, del más antiguo al actual. */
export function getLastPeriods(today: IsoDate, payDay: number, mode: PeriodMode, count: number): FinancialPeriod[] {
  const periods = [getFinancialPeriod(today, payDay, mode)];
  while (periods.length < count) periods.unshift(getPreviousPeriod(periods[0]!, payDay, mode));
  return periods;
}

/**
 * Deuda pendiente a una fecha: deudas ya contraídas a esa fecha, con los
 * abonos hechos hasta ese día (las cuotas pagadas antes de registrarla cuentan siempre).
 */
export function calcDebtAt(date: IsoDate, debts: readonly Debt[], payments: readonly DebtPayment[]): number {
  const existing = debts.filter((debt) => (debt.startDate ?? debt.createdAt.slice(0, 10)) <= date);
  const paymentsUntil = payments.filter((payment) => payment.date <= date);
  return sumAmounts(existing.map((debt) => calcRemainingBalance(toFinanceDebt(debt, paymentsUntil))));
}

export function buildMonthlyReports(input: {
  transactions: readonly Transaction[];
  debts: readonly Debt[];
  payments: readonly DebtPayment[];
  payDay: number;
  mode: PeriodMode;
  today: IsoDate;
  months?: number;
}): MonthReport[] {
  return getLastPeriods(input.today, input.payDay, input.mode, input.months ?? 6).map((period) => {
    const flow = summarizePeriodFlow(filterByPeriod(input.transactions, period));
    // El mes se nombra por el día en que termina el período (un período 25 ago–24 sep es "sep").
    const label = format(parseIsoDate(period.end), 'MMM', { locale: es }).replace('.', '');
    return {
      period,
      label,
      income: flow.income,
      expenses: flow.expenses,
      debtPayments: flow.debtPayments,
      savingsRate: calcSavingsRate(flow.income, flow.expenses + flow.debtPayments),
      debtAtEnd: calcDebtAt(period.end < input.today ? period.end : input.today, input.debts, input.payments),
    };
  });
}
