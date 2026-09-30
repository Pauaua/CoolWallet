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
    const ant = await repos.categories.list({ kinds: ['ant'] });
    expect(ant.length).toBeGreaterThan(0);
    expect(ant.every((category) => category.kind === 'ant')).toBe(true);

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
