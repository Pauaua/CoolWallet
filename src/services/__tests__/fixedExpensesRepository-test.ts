import { createTestContext } from '@/db/testing/testDb';
import { generateRecurringExpenses, type FinancialPeriod } from '@/lib/finance';
import type { FixedExpenseInput } from '@/types/models';

import { NotFoundError } from '../context';
import { createSqliteRepositories } from '../sqlite';

const september: FinancialPeriod = { start: '2026-09-01', end: '2026-09-30', daysInPeriod: 30 };
const range = { from: september.start, to: september.end };

async function setup() {
  const ctx = createTestContext();
  const repos = createSqliteRepositories(ctx);
  await repos.data.seedDefaults();
  const [account] = await repos.accounts.list();
  const [category] = await repos.categories.list({ kinds: ['fixed'] });
  if (!account || !category) throw new Error('seed incompleto');
  const input: FixedExpenseInput = {
    name: 'Arriendo',
    amount: 450_000,
    categoryId: category.id,
    accountId: account.id,
    dueDay: 5,
    frequency: 'monthly',
    startDate: '2026-01-01',
    endDate: null,
    active: true,
    note: null,
  };
  const sync = async () => {
    const all = await repos.fixedExpenses.list();
    await repos.fixedExpenses.syncOccurrences(range, generateRecurringExpenses(all, september));
    return repos.fixedExpenses.listOccurrences(range);
  };
  return { ctx, repos, account, input, sync };
}

describe('FixedExpensesRepository', () => {
  it('CRUD de gastos fijos', async () => {
    const { repos, input } = await setup();
    const rent = await repos.fixedExpenses.create(input);
    await expect(repos.fixedExpenses.getById(rent.id)).resolves.toEqual(rent);
    expect((await repos.fixedExpenses.update(rent.id, { amount: 460_000 })).amount).toBe(460_000);
    await expect(repos.fixedExpenses.list()).resolves.toHaveLength(1);
    await expect(repos.fixedExpenses.update('x', { amount: 1 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('genera los vencimientos del período una sola vez', async () => {
    const { repos, input, sync } = await setup();
    await repos.fixedExpenses.create(input);
    await repos.fixedExpenses.create({ ...input, name: 'Internet', amount: 25_990, dueDay: 15 });
    const first = await sync();
    const second = await sync();
    expect(first).toHaveLength(2);
    expect(second.map((o) => o.id)).toEqual(first.map((o) => o.id));
    expect(first.map((o) => [o.dueDate, o.status])).toEqual([
      ['2026-09-05', 'pending'],
      ['2026-09-15', 'pending'],
    ]);
  });

  it('marcar pagado crea el movimiento; desmarcar lo elimina', async () => {
    const { repos, input, account, sync } = await setup();
    await repos.fixedExpenses.create(input);
    const [occurrence] = await sync();
    if (!occurrence) throw new Error('sin vencimiento');

    const payment = await repos.fixedExpenses.markPaid(occurrence.id, { accountId: account.id, date: '2026-09-04', amount: 450_000 });
    expect(payment).toMatchObject({ type: 'fixed_expense', amount: 450_000, note: 'Arriendo', categoryId: input.categoryId, fixedExpenseId: occurrence.fixedExpenseId });
    const [paid] = await repos.fixedExpenses.listOccurrences(range);
    expect(paid).toMatchObject({ status: 'paid', transactionId: payment.id });

    // Marcar dos veces no duplica el pago.
    await expect(repos.fixedExpenses.markPaid(occurrence.id, { accountId: account.id, date: '2026-09-04', amount: 450_000 })).resolves.toEqual(payment);
    await expect(repos.transactions.list({ types: ['fixed_expense'] })).resolves.toHaveLength(1);

    await repos.fixedExpenses.markPending(occurrence.id);
    const [pending] = await repos.fixedExpenses.listOccurrences(range);
    expect(pending).toMatchObject({ status: 'pending', transactionId: null, paidAt: null });
    await expect(repos.transactions.list()).resolves.toEqual([]);
  });

  it('eliminar el pago desde el historial deja el vencimiento pendiente', async () => {
    const { repos, input, account, sync } = await setup();
    await repos.fixedExpenses.create(input);
    const [occurrence] = await sync();
    if (!occurrence) throw new Error('sin vencimiento');
    const payment = await repos.fixedExpenses.markPaid(occurrence.id, { accountId: account.id, date: '2026-09-05', amount: 450_000 });
    await repos.transactions.remove(payment.id);
    expect((await repos.fixedExpenses.listOccurrences(range))[0]).toMatchObject({ status: 'pending', transactionId: null });
  });

  it('sincronizar actualiza montos y fechas pendientes, sin tocar los pagados', async () => {
    const { repos, input, account, sync } = await setup();
    const rent = await repos.fixedExpenses.create(input);
    const water = await repos.fixedExpenses.create({ ...input, name: 'Agua', amount: 15_000, dueDay: 20 });
    const occurrences = await sync();
    const rentOccurrence = occurrences.find((o) => o.fixedExpenseId === rent.id);
    if (!rentOccurrence) throw new Error('sin vencimiento');
    await repos.fixedExpenses.markPaid(rentOccurrence.id, { accountId: account.id, date: '2026-09-05', amount: 450_000 });

    await repos.fixedExpenses.update(rent.id, { amount: 480_000, dueDay: 10 });
    await repos.fixedExpenses.update(water.id, { amount: 17_000, dueDay: 22 });
    const after = await sync();

    // El arriendo pagado se conserva; el cambio de día genera el nuevo vencimiento pendiente.
    expect(after.filter((o) => o.fixedExpenseId === rent.id).map((o) => [o.dueDate, o.status, o.amount])).toEqual([
      ['2026-09-05', 'paid', 450_000],
      ['2026-09-10', 'pending', 480_000],
    ]);
    expect(after.filter((o) => o.fixedExpenseId === water.id).map((o) => [o.dueDate, o.amount])).toEqual([['2026-09-22', 17_000]]);

    await repos.fixedExpenses.update(water.id, { dueDay: 22, amount: 18_000 });
    expect((await sync()).find((o) => o.fixedExpenseId === water.id)?.amount).toBe(18_000);
  });

  it('eliminar o desactivar un gasto fijo quita sus vencimientos pendientes', async () => {
    const { repos, input, sync } = await setup();
    const rent = await repos.fixedExpenses.create(input);
    const gym = await repos.fixedExpenses.create({ ...input, name: 'Gimnasio', amount: 30_000 });
    expect(await sync()).toHaveLength(2);
    await repos.fixedExpenses.update(gym.id, { active: false });
    expect((await sync()).map((o) => o.fixedExpenseId)).toEqual([rent.id]);
    await repos.fixedExpenses.remove(rent.id);
    await expect(repos.fixedExpenses.listOccurrences(range)).resolves.toEqual([]);
    await expect(repos.fixedExpenses.getById(rent.id)).resolves.toBeNull();
  });

  it('errores con vencimientos inexistentes', async () => {
    const { repos } = await setup();
    await expect(repos.fixedExpenses.markPaid('x', { accountId: null, date: '2026-09-01', amount: 1 })).rejects.toBeInstanceOf(NotFoundError);
    await expect(repos.fixedExpenses.markPending('x')).rejects.toBeInstanceOf(NotFoundError);
  });
});
