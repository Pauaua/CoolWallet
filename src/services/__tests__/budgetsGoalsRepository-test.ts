import { createTestContext } from '@/db/testing/testDb';

import { NotFoundError } from '../context';
import { createSqliteRepositories } from '../sqlite';

async function setup() {
  const repos = createSqliteRepositories(createTestContext());
  await repos.data.seedDefaults();
  const [first, second] = await repos.categories.list({ kinds: ['variable'] });
  if (!first || !second) throw new Error('seed incompleto');
  return { repos, first, second };
}

describe('BudgetsRepository', () => {
  it('un presupuesto por categoría: upsert actualiza', async () => {
    const { repos, first } = await setup();
    const created = await repos.budgets.upsert(first.id, 50_000);
    const updated = await repos.budgets.upsert(first.id, 60_000);
    expect(updated.id).toBe(created.id);
    expect(await repos.budgets.list()).toEqual([updated]);
  });

  it('upsertMany y borrado lógico (se puede volver a crear)', async () => {
    const { repos, first, second } = await setup();
    await repos.budgets.upsertMany([
      { categoryId: first.id, monthlyLimit: 10_000 },
      { categoryId: second.id, monthlyLimit: 20_000 },
    ]);
    const list = await repos.budgets.list();
    expect(list.map((budget) => budget.monthlyLimit).sort()).toEqual([10_000, 20_000]);
    const [removed] = list;
    if (!removed) throw new Error('sin presupuestos');
    await repos.budgets.remove(removed.id);
    expect(await repos.budgets.list()).toHaveLength(1);
    await repos.budgets.upsert(removed.categoryId, 5_000);
    expect(await repos.budgets.list()).toHaveLength(2);
  });
});

describe('SavingsGoalsRepository', () => {
  it('CRUD y abonos sin bajar de 0', async () => {
    const { repos } = await setup();
    const goal = await repos.savingsGoals.create({ name: 'Vacaciones', targetAmount: 800_000, savedAmount: 0, targetDate: '2027-01-15', icon: 'sun', color: 'sky' });
    expect((await repos.savingsGoals.addContribution(goal.id, 100_000)).savedAmount).toBe(100_000);
    expect((await repos.savingsGoals.addContribution(goal.id, -30_000)).savedAmount).toBe(70_000);
    expect((await repos.savingsGoals.addContribution(goal.id, -500_000)).savedAmount).toBe(0);
    expect((await repos.savingsGoals.update(goal.id, { name: 'Viaje' })).name).toBe('Viaje');
    await expect(repos.savingsGoals.getById(goal.id)).resolves.toMatchObject({ name: 'Viaje' });
    await repos.savingsGoals.remove(goal.id);
    await expect(repos.savingsGoals.list()).resolves.toEqual([]);
    await expect(repos.savingsGoals.addContribution(goal.id, 1)).rejects.toBeInstanceOf(NotFoundError);
    await expect(repos.savingsGoals.update(goal.id, { name: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });
});
