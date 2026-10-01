import { addMonths, differenceInCalendarDays } from 'date-fns';

import { percentageOf, roundMoney } from './money';
import { DEBT_DUE_SOON_DAYS, DEBT_RATIO_THRESHOLDS } from './params';
import { parseIsoDate, toIsoDate, type IsoDate } from './period';

/**
 * Tipos de deuda.
 * - `pending`: deuda informal (a un amigo, un pago atrasado).
 * - `installment`: deuda fija en cuotas (crédito de consumo, automotriz…).
 * - `variable`: deuda esporádica con abonos parciales (tarjeta del mes…).
 */
export type DebtKind = 'pending' | 'installment' | 'variable';

/** Datos mínimos de una deuda que necesitan los cálculos. */
export type FinanceDebt = {
  kind: DebtKind;
  /** Monto adeudado (pendiente/variable) o monto financiado (en cuotas). */
  principal: number;
  /** Suma de abonos registrados (pendiente/variable). */
  paidAmount: number;
  /** En cuotas: número total de cuotas. */
  installmentsTotal?: number;
  /** En cuotas: cuotas ya pagadas. */
  installmentsPaid?: number;
  /** En cuotas: abonos extra (que no son una cuota completa); rebajan el saldo. */
  extraPaidAmount?: number;
  /** En cuotas: valor de la cuota. Si falta, se calcula con la fórmula francesa. */
  installmentAmount?: number;
  /** Tasa de interés mensual (0.015 = 1,5%). */
  monthlyRate?: number;
  /** En cuotas: fecha de la primera cuota. */
  firstPaymentDate?: IsoDate;
  /** Pendiente/variable: fecha límite opcional. */
  dueDate?: IsoDate | null;
};

/**
 * Cuota fija (sistema francés): `P·r / (1 − (1 + r)^−n)`.
 * Si la tasa es 0, `P / n`.
 * @param principal Monto financiado.
 * @param monthlyRate Tasa mensual (0.02 = 2%).
 * @param n Número de cuotas (≥ 1).
 */
export function calcInstallment(principal: number, monthlyRate: number, n: number): number {
  if (principal <= 0 || n < 1) return 0;
  const count = Math.trunc(n);
  if (monthlyRate <= 0) return roundMoney(principal / count);
  return roundMoney((principal * monthlyRate) / (1 - (1 + monthlyRate) ** -count));
}

/** Interés total de un crédito: lo pagado en cuotas menos el capital (nunca negativo). */
export function calcTotalInterest(principal: number, installment: number, n: number): number {
  return Math.max(0, roundMoney(installment * n - principal));
}

export type AmortizationRow = {
  number: number;
  installment: number;
  interest: number;
  principalPaid: number;
  /** Saldo de capital después de pagar esta cuota. */
  balance: number;
};

/**
 * Tabla de amortización (sistema francés). El interés de cada cuota se
 * redondea a pesos y la última cuota absorbe la diferencia para dejar el saldo en 0.
 */
export function buildAmortizationTable(principal: number, monthlyRate: number, n: number): AmortizationRow[] {
  const installment = calcInstallment(principal, monthlyRate, n);
  if (installment === 0) return [];
  const count = Math.trunc(n);
  const rows: AmortizationRow[] = [];
  let balance = principal;

  for (let number = 1; number <= count; number += 1) {
    const interest = roundMoney(balance * Math.max(0, monthlyRate));
    const isLast = number === count;
    const principalPaid = isLast ? balance : Math.min(balance, installment - interest);
    balance -= principalPaid;
    rows.push({ number, installment: principalPaid + interest, interest, principalPaid, balance });
  }
  return rows;
}

/** Valor de la cuota de una deuda en cuotas (0 para otros tipos). */
export function getInstallmentAmount(debt: FinanceDebt): number {
  if (debt.kind !== 'installment') return 0;
  return debt.installmentAmount ?? calcInstallment(debt.principal, debt.monthlyRate ?? 0, debt.installmentsTotal ?? 0);
}

/** Cuotas que faltan por pagar; `null` si la deuda no es en cuotas. */
export function calcRemainingInstallments(debt: FinanceDebt): number | null {
  if (debt.kind !== 'installment') return null;
  return Math.max(0, (debt.installmentsTotal ?? 0) - (debt.installmentsPaid ?? 0));
}

/**
 * Saldo por pagar.
 * - En cuotas: cuotas restantes × valor cuota − abonos extra (lo que aún se desembolsará).
 * - Pendiente/variable: monto − abonos.
 */
export function calcRemainingBalance(debt: FinanceDebt): number {
  if (debt.kind === 'installment') {
    return Math.max(0, roundMoney((calcRemainingInstallments(debt) ?? 0) * getInstallmentAmount(debt) - (debt.extraPaidAmount ?? 0)));
  }
  return Math.max(0, roundMoney(debt.principal - debt.paidAmount));
}

/** % pagado de la deuda (0–100). */
export function calcDebtProgress(debt: FinanceDebt): number {
  const progress =
    debt.kind === 'installment'
      ? percentageOf(debt.installmentsPaid ?? 0, debt.installmentsTotal ?? 0)
      : percentageOf(debt.paidAmount, debt.principal);
  return Math.min(100, Math.max(0, progress ?? 0));
}

/** Próximo vencimiento: la siguiente cuota impaga o la fecha límite. `null` si no hay. */
export function getNextDueDate(debt: FinanceDebt): IsoDate | null {
  if (calcRemainingBalance(debt) <= 0) return null;
  if (debt.kind === 'installment') {
    if (!debt.firstPaymentDate) return null;
    return toIsoDate(addMonths(parseIsoDate(debt.firstPaymentDate), debt.installmentsPaid ?? 0));
  }
  return debt.dueDate ?? null;
}

/**
 * Fecha estimada de término: la última cuota (en cuotas) o la fecha límite.
 * `null` si ya está pagada o no hay fecha.
 */
export function estimateEndDate(debt: FinanceDebt): IsoDate | null {
  if (calcRemainingBalance(debt) <= 0) return null;
  if (debt.kind === 'installment') {
    if (!debt.firstPaymentDate) return null;
    return toIsoDate(addMonths(parseIsoDate(debt.firstPaymentDate), (debt.installmentsTotal ?? 1) - 1));
  }
  return debt.dueDate ?? null;
}

export type DebtInterestSummary = { paid: number; pending: number; total: number };

/**
 * Interés de una deuda en cuotas, separado en pagado y por pagar según la
 * tabla de amortización. Para otros tipos es 0.
 */
export function calcDebtInterest(debt: FinanceDebt): DebtInterestSummary {
  if (debt.kind !== 'installment' || !debt.monthlyRate) return { paid: 0, pending: 0, total: 0 };
  const rows = buildAmortizationTable(debt.principal, debt.monthlyRate, debt.installmentsTotal ?? 0);
  const paidCount = debt.installmentsPaid ?? 0;
  let paid = 0;
  let pending = 0;
  for (const row of rows) {
    if (row.number <= paidCount) paid += row.interest;
    else pending += row.interest;
  }
  return { paid, pending, total: paid + pending };
}

/** Pago mensual comprometido: suma de cuotas de las deudas en cuotas con saldo. */
export function calcMonthlyDebtCommitment(debts: readonly FinanceDebt[]): number {
  return debts.reduce(
    (total, debt) => (debt.kind === 'installment' && calcRemainingBalance(debt) > 0 ? total + getInstallmentAmount(debt) : total),
    0,
  );
}

/** Ratio deuda/ingreso (%) = pagos mensuales de deuda / ingreso líquido. `null` sin ingreso. */
export function calcDebtToIncomeRatio(monthlyDebtPayments: number, netIncome: number): number | null {
  return percentageOf(monthlyDebtPayments, netIncome);
}

export type DebtRiskLevel = 'low' | 'medium' | 'high' | 'unknown';

/** Semáforo: verde < 30%, amarillo 30–40%, rojo > 40%. `unknown` si no hay ratio. */
export function getDebtRiskLevel(ratio: number | null): DebtRiskLevel {
  if (ratio === null || !Number.isFinite(ratio)) return 'unknown';
  if (ratio < DEBT_RATIO_THRESHOLDS.medium) return 'low';
  if (ratio <= DEBT_RATIO_THRESHOLDS.high) return 'medium';
  return 'high';
}

export type DebtStatus = 'paid' | 'on_time' | 'due_soon' | 'overdue';

/**
 * Estado de una deuda: pagada, al día, por vencer (dentro de `dueSoonDays`) o vencida.
 * Una deuda sin fecha de vencimiento siempre está al día.
 */
export function getDebtStatus(debt: FinanceDebt, today: IsoDate | Date, dueSoonDays = DEBT_DUE_SOON_DAYS): DebtStatus {
  if (calcRemainingBalance(debt) <= 0) return 'paid';
  const nextDue = getNextDueDate(debt);
  if (!nextDue) return 'on_time';
  const daysUntilDue = differenceInCalendarDays(parseIsoDate(nextDue), parseIsoDate(today));
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= dueSoonDays) return 'due_soon';
  return 'on_time';
}

// ─── Simulador de pago ───────────────────────────────────────────────────────

export type PayoffStrategy = 'snowball' | 'avalanche';

export type PayoffDebt = {
  id: string;
  balance: number;
  monthlyRate: number;
  /** Pago mínimo mensual (la cuota, o 0 si no tiene). */
  minimumPayment: number;
};

export type PayoffResult = {
  /** `false` si con estos pagos la deuda no se termina en `maxMonths`. */
  feasible: boolean;
  /** Meses hasta quedar libre de deudas. */
  months: number;
  totalInterest: number;
  totalPaid: number;
  /** Deudas en el orden en que se terminan de pagar, con el mes. */
  payoffOrder: { id: string; month: number }[];
};

export type PayoffOptions = {
  /** Si al terminar una deuda su pago mínimo se suma al extra (por defecto sí). */
  rollover?: boolean;
  /** Límite de la simulación (por defecto 600 meses = 50 años). */
  maxMonths?: number;
};

/** Orden de prioridad: bola de nieve = saldo menor primero; avalancha = tasa mayor primero. */
export function orderDebtsByStrategy(debts: readonly PayoffDebt[], strategy: PayoffStrategy): PayoffDebt[] {
  return [...debts].sort((a, b) =>
    strategy === 'snowball'
      ? a.balance - b.balance || b.monthlyRate - a.monthlyRate
      : b.monthlyRate - a.monthlyRate || a.balance - b.balance,
  );
}

/**
 * Simula mes a mes el pago de varias deudas: cada mes se cobra el interés
 * (redondeado a pesos), se paga el mínimo de cada una y el monto extra va a
 * la deuda prioritaria según la estrategia.
 */
export function simulatePayoff(
  debts: readonly PayoffDebt[],
  extraMonthly: number,
  strategy: PayoffStrategy,
  options: PayoffOptions = {},
): PayoffResult {
  const { rollover = true, maxMonths = 600 } = options;
  const ordered = orderDebtsByStrategy(debts, strategy)
    .filter((debt) => debt.balance > 0)
    .map((debt) => ({ ...debt }));
  const totalMinimums = ordered.reduce((total, debt) => total + Math.max(0, debt.minimumPayment), 0);
  const extra = Math.max(0, extraMonthly);

  let months = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const payoffOrder: PayoffResult['payoffOrder'] = [];

  while (ordered.some((debt) => debt.balance > 0)) {
    if (months >= maxMonths) return { feasible: false, months, totalInterest, totalPaid, payoffOrder };
    months += 1;
    const active = ordered.filter((debt) => debt.balance > 0);

    for (const debt of active) {
      const interest = roundMoney(debt.balance * Math.max(0, debt.monthlyRate));
      debt.balance += interest;
      totalInterest += interest;
    }

    const activeMinimums = active.reduce((total, debt) => total + Math.max(0, debt.minimumPayment), 0);
    let budget = extra + (rollover ? totalMinimums : activeMinimums);

    for (const debt of active) {
      const payment = Math.min(Math.max(0, debt.minimumPayment), debt.balance, budget);
      debt.balance -= payment;
      budget -= payment;
      totalPaid += payment;
    }
    for (const debt of active) {
      if (budget <= 0) break;
      const payment = Math.min(budget, debt.balance);
      debt.balance -= payment;
      budget -= payment;
      totalPaid += payment;
    }
    for (const debt of active) {
      if (debt.balance <= 0) payoffOrder.push({ id: debt.id, month: months });
    }
  }

  return { feasible: true, months, totalInterest, totalPaid, payoffOrder };
}

export type PayoffComparison = {
  /** Solo pagos mínimos, sin extra. */
  baseline: PayoffResult;
  snowball: PayoffResult;
  avalanche: PayoffResult;
  /** Interés ahorrado vs. pagar solo el mínimo; `null` si alguno no es factible. */
  snowballInterestSaved: number | null;
  avalancheInterestSaved: number | null;
};

/** Compara bola de nieve y avalancha contra pagar solo los mínimos. */
export function comparePayoffStrategies(debts: readonly PayoffDebt[], extraMonthly: number): PayoffComparison {
  const baseline = simulatePayoff(debts, 0, 'avalanche', { rollover: false });
  const snowball = simulatePayoff(debts, extraMonthly, 'snowball');
  const avalanche = simulatePayoff(debts, extraMonthly, 'avalanche');
  const saved = (result: PayoffResult) =>
    baseline.feasible && result.feasible ? baseline.totalInterest - result.totalInterest : null;
  return {
    baseline,
    snowball,
    avalanche,
    snowballInterestSaved: saved(snowball),
    avalancheInterestSaved: saved(avalanche),
  };
}

/**
 * Capital que queda por pagar (sin intereses futuros), base del simulador.
 * - En cuotas con tasa: saldo de la tabla de amortización tras las cuotas pagadas.
 * - En cuotas sin tasa: cuotas restantes × cuota.
 * - Pendiente/variable: monto − abonos.
 */
export function calcOutstandingPrincipal(debt: FinanceDebt): number {
  if (debt.kind !== 'installment') return calcRemainingBalance(debt);
  const total = debt.installmentsTotal ?? 0;
  const paid = Math.min(debt.installmentsPaid ?? 0, total);
  if (paid >= total) return 0;
  if (!debt.monthlyRate || debt.monthlyRate <= 0) return calcRemainingBalance(debt);
  const extra = debt.extraPaidAmount ?? 0;
  if (paid === 0) return Math.max(0, roundMoney(debt.principal - extra));
  const row = buildAmortizationTable(debt.principal, debt.monthlyRate, total)[paid - 1];
  return Math.max(0, (row ? row.balance : 0) - extra);
}

/** Convierte una deuda al formato del simulador (saldo = capital pendiente; mínimo = cuota). */
export function toPayoffDebt(id: string, debt: FinanceDebt): PayoffDebt {
  return {
    id,
    balance: calcOutstandingPrincipal(debt),
    monthlyRate: Math.max(0, debt.monthlyRate ?? 0),
    minimumPayment: debt.kind === 'installment' && calcRemainingBalance(debt) > 0 ? getInstallmentAmount(debt) : 0,
  };
}

/** Fecha estimada en que se termina de pagar: `months` meses después de `from`. */
export function estimateDebtFreeDate(from: IsoDate | Date, months: number): IsoDate {
  return toIsoDate(addMonths(parseIsoDate(from), Math.max(0, Math.trunc(months))));
}

export type InstallmentDueDate = { date: IsoDate; number: number; isPaid: boolean };

/** Vencimientos de cuotas de una deuda en cuotas entre `from` y `to` (inclusive). */
export function listInstallmentDueDates(debt: FinanceDebt, from: IsoDate, to: IsoDate): InstallmentDueDate[] {
  if (debt.kind !== 'installment' || !debt.firstPaymentDate) return [];
  const first = parseIsoDate(debt.firstPaymentDate);
  const total = debt.installmentsTotal ?? 0;
  const paid = debt.installmentsPaid ?? 0;
  const result: InstallmentDueDate[] = [];
  for (let index = 0; index < total; index += 1) {
    const date = toIsoDate(addMonths(first, index));
    if (date > to) break;
    if (date >= from) result.push({ date, number: index + 1, isPaid: index < paid });
  }
  return result;
}
