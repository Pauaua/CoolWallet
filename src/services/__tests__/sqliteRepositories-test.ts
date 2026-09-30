import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '@/db/seed';
import { createTestContext } from '@/db/testing/testDb';
import type { ProfileInput } from '@/types/models';

import { NotFoundError } from '../context';
import { createSqliteRepositories } from '../sqlite';

function setup() {
  const ctx = createTestContext();
  return { ctx, repos: createSqliteRepositories(ctx) };
}

const profileInput: ProfileInput = {
  name: 'Camila Rojas',
  photoUri: null,
  grossSalary: 1_200_000,
  payDay: 25,
  contractType: 'dependiente',
  contractTerm: 'indefinite',
  afpName: 'Modelo',
  afpCommissionRate: 0.0058,
  healthSystem: 'fonasa',
  isapreUf: null,
  hasUnemploymentInsurance: true,
  otherIncome: 0,
};

describe('ProfileRepository', () => {
  it('no hay perfil antes del onboarding', async () => {
    const { repos } = setup();
    await expect(repos.profile.get()).resolves.toBeNull();
  });

  it('crea y luego actualiza la misma fila', async () => {
    const { ctx, repos } = setup();
    const created = await repos.profile.save(profileInput);
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.createdAt).toBe('2026-09-30T12:00:00.000Z');

    ctx.advance(60_000);
    const updated = await repos.profile.save({ ...profileInput, name: 'Camila R.' });
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).toBe('2026-09-30T12:01:00.000Z');
    await expect(repos.profile.get()).resolves.toEqual(updated);
  });

  it('guarda booleanos y decimales con su tipo', async () => {
    const { repos } = setup();
    await repos.profile.save({ ...profileInput, hasUnemploymentInsurance: false, healthSystem: 'isapre', isapreUf: 3.25 });
    const stored = await repos.profile.get();
    expect(stored?.hasUnemploymentInsurance).toBe(false);
    expect(stored?.isapreUf).toBe(3.25);
  });
});

describe('SettingsRepository', () => {
  it('crea la configuración por defecto al leerla', async () => {
    const { repos } = setup();
    const settings = await repos.settings.get();
    expect(settings).toMatchObject({
      currency: 'CLP',
      periodMode: 'payday',
      theme: 'system',
      biometricsEnabled: false,
      lockTimeoutMinutes: 1,
      backupReminderDays: 14,
      onboardingCompletedAt: null,
    });
    await expect(repos.settings.get()).resolves.toEqual(settings);
  });

  it('actualiza parcialmente', async () => {
    const { ctx, repos } = setup();
    const before = await repos.settings.get();
    ctx.advance(1_000);
    const after = await repos.settings.update({ theme: 'dark', lockTimeoutMinutes: 5 });
    expect(after).toMatchObject({ id: before.id, theme: 'dark', lockTimeoutMinutes: 5, periodMode: 'payday' });
    expect(after.updatedAt).not.toBe(before.updatedAt);
  });
});

describe('AccountsRepository y CategoriesRepository', () => {
  it('CRUD con borrado lógico', async () => {
    const { repos } = setup();
    const account = await repos.accounts.create({
      name: 'Tarjeta',
      type: 'credit_card',
      initialBalance: -50_000,
      icon: 'credit-card',
      color: 'slate',
      sortOrder: 5,
    });
    await expect(repos.accounts.getById(account.id)).resolves.toEqual(account);

    const renamed = await repos.accounts.update(account.id, { name: 'Tarjeta Visa' });
    expect(renamed.name).toBe('Tarjeta Visa');

    await repos.accounts.remove(account.id);
    await expect(repos.accounts.getById(account.id)).resolves.toBeNull();
    await expect(repos.accounts.list()).resolves.toEqual([]);
    await expect(repos.accounts.update(account.id, { name: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('filtra categorías por tipo y excluye las eliminadas', async () => {
    const { repos } = setup();
    await repos.data.seedDefaults();
    const ant = await repos.categories.list({ kinds: ['variable'] });
    expect(ant.length).toBeGreaterThan(0);
    expect(ant.every((category) => category.kind === 'variable')).toBe(true);

    const coffee = ant.find((category) => category.name === 'Café');
    expect(coffee).toBeDefined();
    if (!coffee) return;
    const updated = await repos.categories.update(coffee.id, { color: 'amber' });
    expect(updated.color).toBe('amber');
    await repos.categories.remove(coffee.id);
    await expect(repos.categories.getById(coffee.id)).resolves.toBeNull();
    expect((await repos.categories.list()).some((category) => category.id === coffee.id)).toBe(false);
    await expect(repos.categories.update(coffee.id, { name: 'x' })).rejects.toThrow('Categoría no encontrado');
  });

  it('crea categorías propias', async () => {
    const { repos } = setup();
    const pets = await repos.categories.create({
      name: 'Mascotas',
      icon: 'github',
      color: 'olive',
      kind: 'general',
      budgetGroup: 'needs',
      isDefault: false,
      sortOrder: 99,
    });
    await expect(repos.categories.list()).resolves.toEqual([pets]);
  });
});

describe('TransactionsRepository', () => {
  async function seeded() {
    const setupResult = setup();
    await setupResult.repos.data.seedDefaults();
    const [account] = await setupResult.repos.accounts.list();
    const [salaryCategory] = await setupResult.repos.categories.list({ kinds: ['income'] });
    if (!account || !salaryCategory) throw new Error('seed incompleto');
    return { ...setupResult, account, salaryCategory };
  }

  it('crea, filtra y ordena del más reciente al más antiguo', async () => {
    const { repos, account, salaryCategory, ctx } = await seeded();
    const base = { accountId: account.id, categoryId: salaryCategory.id, note: null };
    const salary = await repos.transactions.create({ ...base, type: 'income', amount: 900_000, date: '2026-09-25', isSalary: true });
    ctx.advance(1_000);
    const extra = await repos.transactions.create({ ...base, type: 'income', amount: 50_000, date: '2026-10-02' });
    const adjustment = await repos.transactions.create({ ...base, type: 'adjustment', amount: -5_000, date: '2026-09-01', categoryId: null });

    expect(salary.isSalary).toBe(true);
    expect(extra.isSalary).toBe(false);
    expect((await repos.transactions.list()).map((t) => t.id)).toEqual([extra.id, salary.id, adjustment.id]);
    expect(await repos.transactions.list({ from: '2026-09-25', to: '2026-10-24' })).toHaveLength(2);
    expect(await repos.transactions.list({ types: ['adjustment'] })).toEqual([adjustment]);
    expect(await repos.transactions.list({ onlySalary: true })).toEqual([salary]);
    expect(await repos.transactions.list({ categoryIds: [salaryCategory.id] })).toHaveLength(2);
    expect(await repos.transactions.list({ accountId: 'otra' })).toEqual([]);
  });

  it('actualiza y elimina con borrado lógico', async () => {
    const { repos, account } = await seeded();
    const created = await repos.transactions.create({ type: 'income', amount: 10_000, date: '2026-09-10', accountId: account.id, categoryId: null, note: null });
    const updated = await repos.transactions.update(created.id, { amount: 12_000, note: 'Venta' });
    expect(updated).toMatchObject({ amount: 12_000, note: 'Venta', type: 'income' });
    await repos.transactions.remove(created.id);
    await expect(repos.transactions.getById(created.id)).resolves.toBeNull();
    await expect(repos.transactions.list()).resolves.toEqual([]);
    await expect(repos.transactions.update(created.id, { amount: 1 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rechaza cuentas inexistentes (clave foránea)', async () => {
    const { repos } = await seeded();
    await expect(
      repos.transactions.create({ type: 'income', amount: 1, date: '2026-09-10', accountId: 'no-existe', categoryId: null, note: null }),
    ).rejects.toThrow();
  });
});

describe('DataRepository', () => {
  it('siembra categorías y cuentas una sola vez', async () => {
    const { repos } = setup();
    await repos.data.seedDefaults();
    await repos.data.seedDefaults();
    const allCategories = await repos.categories.list();
    expect(allCategories).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(allCategories[0]).toMatchObject({ name: DEFAULT_CATEGORIES[0]?.name, isDefault: true, sortOrder: 0 });
    await expect(repos.accounts.list()).resolves.toHaveLength(DEFAULT_ACCOUNTS.length);
  });

  it('no recrea categorías por defecto que la persona eliminó', async () => {
    const { repos } = setup();
    await repos.data.seedDefaults();
    const [first] = await repos.categories.list();
    if (first) await repos.categories.remove(first.id);
    await repos.data.seedDefaults();
    await expect(repos.categories.list()).resolves.toHaveLength(DEFAULT_CATEGORIES.length - 1);
  });

  it('wipeAll borra todo', async () => {
    const { repos } = setup();
    await repos.data.seedDefaults();
    await repos.profile.save(profileInput);
    await repos.settings.update({ theme: 'dark' });
    await repos.data.wipeAll();
    await expect(repos.profile.get()).resolves.toBeNull();
    await expect(repos.categories.list()).resolves.toEqual([]);
    await expect(repos.accounts.list()).resolves.toEqual([]);
    expect((await repos.settings.get()).theme).toBe('system');
  });
});
