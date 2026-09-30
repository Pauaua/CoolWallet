import { createTestContext } from '@/db/testing/testDb';
import type { DebtInput } from '@/types/models';

import { NotFoundError } from '../context';
import { createSqliteRepositories } from '../sqlite';

const loanInput: DebtInput = {
  kind: 'installment',
  name: 'Crédito de consumo',
  creditor: 'Banco',
  principal: 1_000_000,
  installmentsTotal: 12,
  installmentsPaidInitial: 2,
  installmentAmount: 94_560,
  monthlyRate: 0.02,
  startDate: '2026-05-10',
  firstPaymentDate: '2026-06-05',
  dueDate: null,
  accountId: null,
  note: null,
};

async function setup() {
  const ctx = createTestContext();
  const repos = createSqliteRepositories(ctx);
  await repos.data.seedDefaults();
  const [account] = await repos.accounts.list();
  if (!account) throw new Error('seed incompleto');
  return { ctx, repos, account };
}

describe('DebtsRepository', () => {
  it('CRUD con borrado lógico', async () => {
    const { repos } = await setup();
    const loan = await repos.debts.create(loanInput);
    expect(loan).toMatchObject({ kind: 'installment', monthlyRate: 0.02, startDate: '2026-05-10' });
    expect((await repos.debts.update(loan.id, { name: 'Crédito auto' })).name).toBe('Crédito auto');
    await repos.debts.remove(loan.id);
    await expect(repos.debts.getById(loan.id)).resolves.toBeNull();
    await expect(repos.debts.list()).resolves.toEqual([]);
    await expect(repos.debts.update(loan.id, { name: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('un abono crea el movimiento de pago de deuda y se puede eliminar', async () => {
    const { repos, account } = await setup();
    const loan = await repos.debts.create(loanInput);
    const payment = await repos.debts.addPayment(loan.id, { amount: 94_560, date: '2026-09-05', accountId: account.id, isInstallment: true });
    expect(payment).toMatchObject({ debtId: loan.id, amount: 94_560, isInstallment: true });

    const [movement] = await repos.transactions.list({ types: ['debt_payment'] });
    expect(movement).toMatchObject({ id: payment.transactionId, amount: 94_560, debtId: loan.id, note: 'Crédito de consumo', accountId: account.id });

    await repos.debts.removePayment(payment.id);
    await expect(repos.debts.listPayments(loan.id)).resolves.toEqual([]);
    await expect(repos.transactions.list()).resolves.toEqual([]);
  });

  it('eliminar el movimiento desde el historial elimina el abono', async () => {
    const { repos, account } = await setup();
    const loan = await repos.debts.create(loanInput);
    const payment = await repos.debts.addPayment(loan.id, { amount: 50_000, date: '2026-09-05', accountId: account.id, isInstallment: false });
    await repos.transactions.remove(payment.transactionId ?? '');
    await expect(repos.debts.listPayments()).resolves.toEqual([]);
  });

  it('lista pagos por deuda, del más reciente al más antiguo', async () => {
    const { repos, account } = await setup();
    const loan = await repos.debts.create(loanInput);
    const friend = await repos.debts.create({ ...loanInput, kind: 'pending', name: 'Amigo', installmentsTotal: null, installmentAmount: null, monthlyRate: null });
    await repos.debts.addPayment(loan.id, { amount: 1, date: '2026-08-05', accountId: account.id, isInstallment: true });
    await repos.debts.addPayment(loan.id, { amount: 2, date: '2026-09-05', accountId: account.id, isInstallment: true });
    await repos.debts.addPayment(friend.id, { amount: 3, date: '2026-09-01', accountId: null, isInstallment: false });
    expect((await repos.debts.listPayments(loan.id)).map((p) => p.amount)).toEqual([2, 1]);
    await expect(repos.debts.listPayments()).resolves.toHaveLength(3);
  });

  it('errores con deudas o abonos inexistentes', async () => {
    const { repos } = await setup();
    await expect(repos.debts.addPayment('x', { amount: 1, date: '2026-09-01', accountId: null, isInstallment: false })).rejects.toBeInstanceOf(NotFoundError);
    await expect(repos.debts.removePayment('x')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('sincronía con el historial', () => {
  it('editar el movimiento de un abono actualiza el abono', async () => {
    const { repos, account } = await setup();
    const loan = await repos.debts.create(loanInput);
    const payment = await repos.debts.addPayment(loan.id, { amount: 50_000, date: '2026-09-05', accountId: account.id, isInstallment: false });
    await repos.transactions.update(payment.transactionId ?? '', { amount: 60_000, date: '2026-09-06' });
    expect((await repos.debts.listPayments(loan.id))[0]).toMatchObject({ amount: 60_000, date: '2026-09-06' });
  });
});
