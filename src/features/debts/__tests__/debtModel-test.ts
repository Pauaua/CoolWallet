import type { Debt, DebtPayment } from '@/types/models';

import { buildDebtsSummary, buildDebtView, toFinanceDebt } from '../debtModel';

const stamp = { createdAt: '', updatedAt: '', deletedAt: null };
const TODAY = '2026-09-30';

const loan: Debt = {
  id: 'loan',
  kind: 'installment',
  name: 'Crédito',
  creditor: 'Banco',
  principal: 1_000_000,
  installmentsTotal: 12,
  installmentsPaidInitial: 2,
  installmentAmount: 94_560,
  monthlyRate: 0.02,
  startDate: null,
  firstPaymentDate: '2026-06-05',
  dueDate: null,
  accountId: null,
  note: null,
  ...stamp,
};
const friend: Debt = { ...loan, id: 'friend', kind: 'pending', name: 'Amigo', principal: 100_000, installmentsTotal: null, installmentsPaidInitial: 0, installmentAmount: null, monthlyRate: null, firstPaymentDate: null, dueDate: '2026-09-20' };
const card: Debt = { ...friend, id: 'card', kind: 'variable', name: 'Tarjeta', principal: 200_000, dueDate: null };

let counter = 0;
const pay = (debtId: string, amount: number, isInstallment: boolean): DebtPayment => {
  counter += 1;
  return { id: `p${counter}`, debtId, amount, date: '2026-09-01', accountId: null, transactionId: null, isInstallment, ...stamp };
};

describe('toFinanceDebt', () => {
  it('suma abonos y cuotas pagadas (iniciales + registradas)', () => {
    const finance = toFinanceDebt(loan, [pay('loan', 94_560, true), pay('loan', 10_000, false), pay('friend', 5, false)]);
    expect(finance).toMatchObject({ kind: 'installment', paidAmount: 104_560, installmentsPaid: 3, installmentsTotal: 12, monthlyRate: 0.02, firstPaymentDate: '2026-06-05' });
  });
});

describe('buildDebtView', () => {
  it('en cuotas: restantes, saldo, próxima cuota y término', () => {
    const view = buildDebtView(loan, [pay('loan', 94_560, true), pay('loan', 94_560, true)], TODAY);
    expect(view).toMatchObject({
      installmentsPaid: 4,
      remainingInstallments: 8,
      remainingBalance: 756_480,
      nextDueDate: '2026-10-05',
      endDate: '2027-05-05',
      status: 'due_soon',
    });
    expect(view.progress).toBeCloseTo(33.33, 2);
    expect(view.payments).toHaveLength(2);
  });

  it('pendiente vencida y con abono parcial', () => {
    const view = buildDebtView(friend, [pay('friend', 30_000, false)], TODAY);
    expect(view).toMatchObject({ remainingBalance: 70_000, status: 'overdue', remainingInstallments: null, progress: 30 });
  });
});

describe('buildDebtsSummary', () => {
  it('totales, compromiso mensual y semáforo; pagadas aparte', () => {
    const paidOff: Debt = { ...friend, id: 'paid', name: 'Pagada' };
    const summary = buildDebtsSummary(
      [loan, friend, card, paidOff],
      [pay('loan', 94_560, true), pay('loan', 94_560, true), pay('paid', 100_000, false)],
      1_000_000,
      TODAY,
    );
    expect(summary.active.map((view) => view.debt.id)).toEqual(['friend', 'loan', 'card']);
    expect(summary.paid.map((view) => view.debt.id)).toEqual(['paid']);
    expect(summary.totalDebt).toBe(756_480 + 100_000 + 200_000);
    expect(summary.monthlyCommitment).toBe(94_560);
    expect(summary.ratio).toBeCloseTo(9.456, 3);
    expect(summary.risk).toBe('low');
  });

  it('sin ingreso el semáforo es desconocido; sin deudas todo es 0', () => {
    expect(buildDebtsSummary([loan], [], 0, TODAY).risk).toBe('unknown');
    expect(buildDebtsSummary([], [], 1_000_000, TODAY)).toEqual({ active: [], paid: [], totalDebt: 0, monthlyCommitment: 0, ratio: 0, risk: 'low' });
  });
});
