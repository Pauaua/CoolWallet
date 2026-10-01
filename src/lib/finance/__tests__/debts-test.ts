import {
  buildAmortizationTable,
  calcDebtInterest,
  calcDebtProgress,
  calcDebtToIncomeRatio,
  calcInstallment,
  calcOutstandingPrincipal,
  calcMonthlyDebtCommitment,
  calcRemainingBalance,
  calcRemainingInstallments,
  calcTotalInterest,
  comparePayoffStrategies,
  estimateDebtFreeDate,
  estimateEndDate,
  getDebtRiskLevel,
  getDebtStatus,
  getInstallmentAmount,
  getNextDueDate,
  listInstallmentDueDates,
  orderDebtsByStrategy,
  simulatePayoff,
  toPayoffDebt,
  type FinanceDebt,
  type PayoffDebt,
} from '../debts';

const TODAY = '2026-09-30';

const consumerLoan: FinanceDebt = {
  kind: 'installment',
  principal: 1_000_000,
  paidAmount: 0,
  installmentsTotal: 12,
  installmentsPaid: 4,
  monthlyRate: 0.02,
  firstPaymentDate: '2026-06-05',
};

const friendDebt: FinanceDebt = { kind: 'pending', principal: 100_000, paidAmount: 30_000, dueDate: null };

describe('calcInstallment', () => {
  it('fórmula francesa', () => {
    expect(calcInstallment(1_000_000, 0.02, 12)).toBe(94_560);
  });

  it('tasa 0: capital / n', () => {
    expect(calcInstallment(1_000_000, 0, 12)).toBe(83_333);
    expect(calcInstallment(1_000_000, -0.01, 4)).toBe(250_000);
  });

  it('devuelve 0 sin capital o sin cuotas', () => {
    expect(calcInstallment(0, 0.02, 12)).toBe(0);
    expect(calcInstallment(-5, 0.02, 12)).toBe(0);
    expect(calcInstallment(1_000_000, 0.02, 0)).toBe(0);
  });
});

describe('calcTotalInterest', () => {
  it('cuotas × n − capital', () => {
    expect(calcTotalInterest(1_000_000, 94_560, 12)).toBe(134_720);
  });

  it('nunca es negativo', () => {
    expect(calcTotalInterest(1_000_000, 50_000, 12)).toBe(0);
  });
});

describe('buildAmortizationTable', () => {
  it('amortiza todo el capital y termina en 0', () => {
    const table = buildAmortizationTable(1_000_000, 0.02, 12);
    expect(table).toHaveLength(12);
    expect(table[0]).toEqual({ number: 1, installment: 94_560, interest: 20_000, principalPaid: 74_560, balance: 925_440 });
    expect(table.at(-1)?.balance).toBe(0);
    expect(table.reduce((sum, row) => sum + row.principalPaid, 0)).toBe(1_000_000);
    expect(table.reduce((sum, row) => sum + row.interest, 0)).toBe(134_715);
  });

  it('con tasa 0 la última cuota absorbe el redondeo', () => {
    expect(buildAmortizationTable(100, 0, 3).map((row) => row.installment)).toEqual([33, 33, 34]);
  });

  it('sin capital devuelve tabla vacía', () => {
    expect(buildAmortizationTable(0, 0.02, 12)).toEqual([]);
  });
});

describe('cuotas y saldos', () => {
  it('calcula la cuota si no viene', () => {
    expect(getInstallmentAmount(consumerLoan)).toBe(94_560);
    expect(getInstallmentAmount({ ...consumerLoan, installmentAmount: 90_000 })).toBe(90_000);
    expect(getInstallmentAmount(friendDebt)).toBe(0);
  });

  it('cuotas restantes', () => {
    expect(calcRemainingInstallments(consumerLoan)).toBe(8);
    expect(calcRemainingInstallments({ ...consumerLoan, installmentsPaid: 15 })).toBe(0);
    expect(calcRemainingInstallments(friendDebt)).toBeNull();
  });

  it('saldo por pagar', () => {
    expect(calcRemainingBalance(consumerLoan)).toBe(756_480);
    expect(calcRemainingBalance(friendDebt)).toBe(70_000);
    expect(calcRemainingBalance({ ...friendDebt, paidAmount: 150_000 })).toBe(0);
  });

  it('usa valores por defecto si faltan datos de cuotas', () => {
    expect(calcRemainingInstallments({ kind: 'installment', principal: 1_000, paidAmount: 0 })).toBe(0);
    expect(calcRemainingBalance({ kind: 'installment', principal: 1_000, paidAmount: 0 })).toBe(0);
  });

  it('progreso (0–100)', () => {
    expect(calcDebtProgress(consumerLoan)).toBeCloseTo(33.33, 2);
    expect(calcDebtProgress(friendDebt)).toBe(30);
    expect(calcDebtProgress({ ...friendDebt, paidAmount: 500_000 })).toBe(100);
    expect(calcDebtProgress({ ...friendDebt, principal: 0 })).toBe(0);
    expect(calcDebtProgress({ kind: 'installment', principal: 1_000, paidAmount: 0 })).toBe(0);
  });
});

describe('fechas', () => {
  it('próximo vencimiento de una deuda en cuotas', () => {
    expect(getNextDueDate(consumerLoan)).toBe('2026-10-05');
    expect(getNextDueDate({ ...consumerLoan, firstPaymentDate: '2026-01-31', installmentsPaid: 1 })).toBe('2026-02-28');
  });

  it('próximo vencimiento de otras deudas es la fecha límite', () => {
    expect(getNextDueDate({ ...friendDebt, dueDate: '2026-10-10' })).toBe('2026-10-10');
    expect(getNextDueDate(friendDebt)).toBeNull();
    expect(getNextDueDate({ ...friendDebt, dueDate: undefined })).toBeNull();
  });

  it('sin fecha de primera cuota o ya pagada no hay fechas', () => {
    expect(getNextDueDate({ ...consumerLoan, firstPaymentDate: undefined })).toBeNull();
    expect(estimateEndDate({ ...consumerLoan, firstPaymentDate: undefined })).toBeNull();
    expect(getNextDueDate({ ...consumerLoan, installmentsPaid: 12 })).toBeNull();
    expect(estimateEndDate({ ...consumerLoan, installmentsPaid: 12 })).toBeNull();
  });

  it('fecha estimada de término', () => {
    expect(estimateEndDate(consumerLoan)).toBe('2027-05-05');
    expect(estimateEndDate({ ...friendDebt, dueDate: '2026-12-01' })).toBe('2026-12-01');
    expect(estimateEndDate(friendDebt)).toBeNull();
    expect(estimateEndDate({ ...friendDebt, dueDate: undefined })).toBeNull();
  });

  it('sin total de cuotas no hay fecha de término', () => {
    const debt: FinanceDebt = { ...consumerLoan, installmentsTotal: undefined, installmentsPaid: undefined, installmentAmount: 1_000 };
    expect(estimateEndDate(debt)).toBeNull();
  });
});

describe('calcDebtInterest', () => {
  it('separa el interés pagado del pendiente', () => {
    const interest = calcDebtInterest(consumerLoan);
    expect(interest.total).toBe(134_715);
    expect(interest.paid + interest.pending).toBe(interest.total);
    const firstFour = buildAmortizationTable(1_000_000, 0.02, 12).slice(0, 4);
    expect(interest.paid).toBe(firstFour.reduce((sum, row) => sum + row.interest, 0));
  });

  it('sin tasa o sin cuotas es 0', () => {
    expect(calcDebtInterest({ ...consumerLoan, monthlyRate: 0 })).toEqual({ paid: 0, pending: 0, total: 0 });
    expect(calcDebtInterest(friendDebt)).toEqual({ paid: 0, pending: 0, total: 0 });
  });

  it('tolera datos faltantes', () => {
    expect(calcDebtInterest({ kind: 'installment', principal: 1_000, paidAmount: 0, monthlyRate: 0.02 }).total).toBe(0);
    expect(calcDebtInterest({ ...consumerLoan, installmentsPaid: undefined }).paid).toBe(0);
  });
});

describe('calcMonthlyDebtCommitment', () => {
  it('suma las cuotas de deudas en cuotas con saldo', () => {
    expect(calcMonthlyDebtCommitment([consumerLoan, friendDebt, { ...consumerLoan, installmentsPaid: 12 }])).toBe(94_560);
    expect(calcMonthlyDebtCommitment([])).toBe(0);
  });
});

describe('ratio deuda/ingreso', () => {
  it('calcula el %', () => {
    expect(calcDebtToIncomeRatio(300_000, 1_000_000)).toBe(30);
    expect(calcDebtToIncomeRatio(100, 0)).toBeNull();
  });

  it('semáforo', () => {
    expect(getDebtRiskLevel(0)).toBe('low');
    expect(getDebtRiskLevel(29.99)).toBe('low');
    expect(getDebtRiskLevel(30)).toBe('medium');
    expect(getDebtRiskLevel(40)).toBe('medium');
    expect(getDebtRiskLevel(40.01)).toBe('high');
    expect(getDebtRiskLevel(null)).toBe('unknown');
    expect(getDebtRiskLevel(Infinity)).toBe('unknown');
  });
});

describe('getDebtStatus', () => {
  it('por vencer dentro del margen', () => {
    expect(getDebtStatus(consumerLoan, TODAY)).toBe('due_soon');
    expect(getDebtStatus({ ...friendDebt, dueDate: TODAY }, TODAY)).toBe('due_soon');
  });

  it('al día fuera del margen o sin fecha', () => {
    expect(getDebtStatus(consumerLoan, TODAY, 3)).toBe('on_time');
    expect(getDebtStatus({ ...friendDebt, dueDate: '2026-10-20' }, TODAY)).toBe('on_time');
    expect(getDebtStatus(friendDebt, TODAY)).toBe('on_time');
  });

  it('vencida si la fecha ya pasó', () => {
    expect(getDebtStatus({ ...consumerLoan, installmentsPaid: 2 }, TODAY)).toBe('overdue');
    expect(getDebtStatus({ ...friendDebt, dueDate: '2026-09-29' }, new Date(2026, 8, 30))).toBe('overdue');
  });

  it('pagada si no hay saldo', () => {
    expect(getDebtStatus({ ...friendDebt, paidAmount: 100_000, dueDate: '2026-01-01' }, TODAY)).toBe('paid');
  });
});

describe('simulador de pago', () => {
  const small: PayoffDebt = { id: 'small', balance: 30_000, monthlyRate: 0, minimumPayment: 10_000 };
  const big: PayoffDebt = { id: 'big', balance: 100_000, monthlyRate: 0, minimumPayment: 10_000 };

  it('ordena según la estrategia', () => {
    const cheap: PayoffDebt = { id: 'cheap', balance: 50_000, monthlyRate: 0.01, minimumPayment: 5_000 };
    const expensive: PayoffDebt = { id: 'expensive', balance: 500_000, monthlyRate: 0.03, minimumPayment: 20_000 };
    const tieBig: PayoffDebt = { id: 'tieBig', balance: 900_000, monthlyRate: 0.03, minimumPayment: 20_000 };
    const tieRate: PayoffDebt = { id: 'tieRate', balance: 50_000, monthlyRate: 0.02, minimumPayment: 5_000 };
    expect(orderDebtsByStrategy([expensive, cheap, tieRate], 'snowball').map((d) => d.id)).toEqual(['tieRate', 'cheap', 'expensive']);
    expect(orderDebtsByStrategy([cheap, tieBig, expensive], 'avalanche').map((d) => d.id)).toEqual(['expensive', 'tieBig', 'cheap']);
  });

  it('sin interés: 10 meses solo con el mínimo, 5 con extra', () => {
    const debt: PayoffDebt = { id: 'a', balance: 100_000, monthlyRate: 0, minimumPayment: 10_000 };
    expect(simulatePayoff([debt], 0, 'snowball')).toEqual({
      feasible: true,
      months: 10,
      totalInterest: 0,
      totalPaid: 100_000,
      payoffOrder: [{ id: 'a', month: 10 }],
    });
    expect(simulatePayoff([debt], 10_000, 'snowball').months).toBe(5);
  });

  it('bola de nieve: el mínimo liberado pasa a la siguiente deuda', () => {
    const result = simulatePayoff([big, small], 10_000, 'snowball');
    expect(result.months).toBe(5);
    expect(result.totalPaid).toBe(130_000);
    expect(result.payoffOrder).toEqual([
      { id: 'small', month: 2 },
      { id: 'big', month: 5 },
    ]);
  });

  it('sin rollover tarda más', () => {
    expect(simulatePayoff([big, small], 0, 'snowball', { rollover: false }).months).toBe(10);
  });

  it('avalancha paga igual o menos interés que bola de nieve', () => {
    const debts: PayoffDebt[] = [
      { id: 'card', balance: 800_000, monthlyRate: 0.035, minimumPayment: 40_000 },
      { id: 'friend', balance: 150_000, monthlyRate: 0, minimumPayment: 10_000 },
      { id: 'loan', balance: 2_000_000, monthlyRate: 0.015, minimumPayment: 90_000 },
    ];
    const snowball = simulatePayoff(debts, 100_000, 'snowball');
    const avalanche = simulatePayoff(debts, 100_000, 'avalanche');
    expect(snowball.feasible && avalanche.feasible).toBe(true);
    expect(avalanche.totalInterest).toBeLessThanOrEqual(snowball.totalInterest);
    expect(snowball.payoffOrder[0]?.id).toBe('friend');
    expect(avalanche.payoffOrder[0]?.id).toBe('card');
  });

  it('no factible si el pago no cubre el interés', () => {
    const debt: PayoffDebt = { id: 'x', balance: 100_000, monthlyRate: 0.05, minimumPayment: 1_000 };
    const result = simulatePayoff([debt], 0, 'avalanche', { maxMonths: 24 });
    expect(result.feasible).toBe(false);
    expect(result.months).toBe(24);
  });

  it('sin deudas: 0 meses', () => {
    expect(simulatePayoff([], 50_000, 'snowball')).toEqual({ feasible: true, months: 0, totalInterest: 0, totalPaid: 0, payoffOrder: [] });
    expect(simulatePayoff([{ ...small, balance: 0 }], 0, 'snowball').months).toBe(0);
  });

  it('ignora extras y mínimos negativos', () => {
    const debt: PayoffDebt = { id: 'a', balance: 100_000, monthlyRate: 0, minimumPayment: -5 };
    expect(simulatePayoff([debt], -10, 'snowball', { maxMonths: 3 }).feasible).toBe(false);
  });

  it('compara estrategias contra pagar solo el mínimo', () => {
    const debts: PayoffDebt[] = [
      { id: 'card', balance: 500_000, monthlyRate: 0.03, minimumPayment: 30_000 },
      { id: 'loan', balance: 300_000, monthlyRate: 0.01, minimumPayment: 20_000 },
    ];
    const comparison = comparePayoffStrategies(debts, 50_000);
    expect(comparison.baseline.feasible).toBe(true);
    expect(comparison.avalanche.months).toBeLessThan(comparison.baseline.months);
    expect(comparison.avalancheInterestSaved).toBe(comparison.baseline.totalInterest - comparison.avalanche.totalInterest);
    expect(comparison.snowballInterestSaved).toBe(comparison.baseline.totalInterest - comparison.snowball.totalInterest);
    expect(comparison.avalancheInterestSaved ?? 0).toBeGreaterThan(0);
  });

  it('sin línea base factible el ahorro es null', () => {
    const debts: PayoffDebt[] = [{ id: 'friend', balance: 100_000, monthlyRate: 0, minimumPayment: 0 }];
    const comparison = comparePayoffStrategies(debts, 20_000);
    expect(comparison.baseline.feasible).toBe(false);
    expect(comparison.snowball.months).toBe(5);
    expect(comparison.snowballInterestSaved).toBeNull();
    expect(comparison.avalancheInterestSaved).toBeNull();
  });
});

describe('calcOutstandingPrincipal / toPayoffDebt', () => {
  it('en cuotas con tasa: saldo de la tabla de amortización', () => {
    const table = buildAmortizationTable(1_000_000, 0.02, 12);
    expect(calcOutstandingPrincipal(consumerLoan)).toBe(table[3]?.balance);
    expect(calcOutstandingPrincipal({ ...consumerLoan, installmentsPaid: 0 })).toBe(1_000_000);
    expect(calcOutstandingPrincipal({ ...consumerLoan, installmentsPaid: 12 })).toBe(0);
    expect(calcOutstandingPrincipal({ ...consumerLoan, installmentsPaid: 20 })).toBe(0);
  });

  it('en cuotas sin tasa y otras deudas: saldo por pagar', () => {
    expect(calcOutstandingPrincipal({ ...consumerLoan, monthlyRate: 0, installmentAmount: 50_000 })).toBe(400_000);
    expect(calcOutstandingPrincipal(friendDebt)).toBe(70_000);
    expect(calcOutstandingPrincipal({ kind: 'installment', principal: 1_000, paidAmount: 0 })).toBe(0);
  });

  it('formato del simulador', () => {
    expect(toPayoffDebt('loan', consumerLoan)).toEqual({
      id: 'loan',
      balance: calcOutstandingPrincipal(consumerLoan),
      monthlyRate: 0.02,
      minimumPayment: 94_560,
    });
    expect(toPayoffDebt('friend', friendDebt)).toEqual({ id: 'friend', balance: 70_000, monthlyRate: 0, minimumPayment: 0 });
    expect(toPayoffDebt('done', { ...consumerLoan, installmentsPaid: 12 }).minimumPayment).toBe(0);
  });
});

describe('estimateDebtFreeDate', () => {
  it('suma meses a la fecha de hoy', () => {
    expect(estimateDebtFreeDate('2026-09-30', 5)).toBe('2027-02-28');
    expect(estimateDebtFreeDate('2026-09-30', 0)).toBe('2026-09-30');
    expect(estimateDebtFreeDate('2026-09-30', -3)).toBe('2026-09-30');
  });
});

describe('abonos extra en deudas en cuotas', () => {
  it('rebajan el saldo por pagar y el capital pendiente, sin bajar de 0', () => {
    expect(calcRemainingBalance({ ...consumerLoan, extraPaidAmount: 56_480 })).toBe(700_000);
    expect(calcRemainingBalance({ ...consumerLoan, extraPaidAmount: 5_000_000 })).toBe(0);
    const base = calcOutstandingPrincipal(consumerLoan);
    expect(calcOutstandingPrincipal({ ...consumerLoan, extraPaidAmount: 100_000 })).toBe(base - 100_000);
    expect(calcOutstandingPrincipal({ ...consumerLoan, installmentsPaid: 0, extraPaidAmount: 200_000 })).toBe(800_000);
    expect(getDebtStatus({ ...consumerLoan, extraPaidAmount: 5_000_000 }, TODAY)).toBe('paid');
  });
});

describe('listInstallmentDueDates', () => {
  it('cuotas del rango con su número y si están pagadas', () => {
    expect(listInstallmentDueDates(consumerLoan, '2026-09-01', '2026-10-31')).toEqual([
      { date: '2026-09-05', number: 4, isPaid: true },
      { date: '2026-10-05', number: 5, isPaid: false },
    ]);
  });

  it('no pasa de la última cuota y respeta fines de mes', () => {
    expect(listInstallmentDueDates(consumerLoan, '2027-05-01', '2027-12-31')).toEqual([{ date: '2027-05-05', number: 12, isPaid: false }]);
    expect(listInstallmentDueDates({ ...consumerLoan, firstPaymentDate: '2026-01-31' }, '2026-02-01', '2026-02-28')[0]?.date).toBe('2026-02-28');
  });

  it('sin cuotas o sin fecha: vacío', () => {
    expect(listInstallmentDueDates(friendDebt, '2026-01-01', '2026-12-31')).toEqual([]);
    expect(listInstallmentDueDates({ ...consumerLoan, firstPaymentDate: undefined }, '2026-01-01', '2026-12-31')).toEqual([]);
    expect(listInstallmentDueDates({ ...consumerLoan, installmentsTotal: undefined }, '2026-01-01', '2026-12-31')).toEqual([]);
  });
});
