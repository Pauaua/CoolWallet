import { budgets, savingsGoals } from '@/db/schema';
import { createTestContext } from '@/db/testing/testDb';
import { generateRecurringExpenses } from '@/lib/finance';

import { BACKUP_SCHEMA_VERSION, backupFileName, parseBackup } from '../backup/backupFormat';
import { createBackup, importBackup, prepareImport, serializeBackup } from '../backup/backupService';
import { newRowFields } from '../context';
import { createSqliteRepositories } from '../sqlite';

/** Base con datos en TODAS las tablas, incluidos registros eliminados. */
async function populatedDatabase() {
  const ctx = createTestContext();
  const repos = createSqliteRepositories(ctx);
  await repos.data.seedDefaults();
  const [account] = await repos.accounts.list();
  const [category] = await repos.categories.list({ kinds: ['fixed'] });
  if (!account || !category) throw new Error('seed incompleto');

  await repos.profile.save({
    name: 'Camila Rojas',
    photoUri: null,
    grossSalary: 1_500_000,
    payDay: 25,
    contractType: 'dependiente',
    contractTerm: 'indefinite',
    afpName: 'Modelo',
    afpCommissionRate: 0.0058,
    healthSystem: 'isapre',
    isapreUf: 3.5,
    hasUnemploymentInsurance: true,
    otherIncome: 50_000,
  });
  await repos.settings.update({ theme: 'dark', lastBackupAt: '2026-09-01T10:00:00.000Z', ufValue: 40_312 });
  await repos.transactions.create({ type: 'income', amount: 1_200_000, date: '2026-09-25', accountId: account.id, categoryId: null, note: 'Sueldo', isSalary: true });
  const deleted = await repos.transactions.create({ type: 'variable_expense', amount: 2_500, date: '2026-09-26', accountId: account.id, categoryId: null, note: 'Café' });
  await repos.transactions.remove(deleted.id);

  const rent = await repos.fixedExpenses.create({
    name: 'Arriendo',
    amount: 450_000,
    categoryId: category.id,
    accountId: account.id,
    dueDay: 5,
    frequency: 'monthly',
    startDate: '2026-01-01',
    endDate: null,
    active: true,
    note: 'Depto',
  });
  const period = { start: '2026-09-01', end: '2026-09-30', daysInPeriod: 30 };
  await repos.fixedExpenses.syncOccurrences({ from: period.start, to: period.end }, generateRecurringExpenses([rent], period));
  const [occurrence] = await repos.fixedExpenses.listOccurrences({ from: period.start, to: period.end });
  if (occurrence) await repos.fixedExpenses.markPaid(occurrence.id, { accountId: account.id, date: '2026-09-05', amount: 450_000 });

  const loan = await repos.debts.create({
    kind: 'installment',
    name: 'Crédito',
    creditor: 'Banco',
    principal: 1_000_000,
    installmentsTotal: 12,
    installmentsPaidInitial: 2,
    installmentAmount: null,
    monthlyRate: 0.015,
    startDate: '2026-05-01',
    firstPaymentDate: '2026-06-05',
    dueDate: null,
    accountId: account.id,
    note: null,
  });
  await repos.debts.addPayment(loan.id, { amount: 91_680, date: '2026-09-05', accountId: account.id, isInstallment: true });

  ctx.db.insert(budgets).values({ categoryId: category.id, monthlyLimit: 500_000, ...newRowFields(ctx) }).run();
  ctx.db.insert(savingsGoals).values({ name: 'Vacaciones', targetAmount: 800_000, savedAmount: 120_000, targetDate: '2027-01-15', ...newRowFields(ctx) }).run();

  return { ctx, repos };
}

describe('respaldo JSON', () => {
  it('exportar → importar deja los datos idénticos', async () => {
    const source = await populatedDatabase();
    const original = await createBackup(source.repos.data, '2026-09-30T12:00:00.000Z');
    const text = serializeBackup(original);

    const target = createSqliteRepositories(createTestContext());
    await target.data.seedDefaults(); // datos previos que deben desaparecer
    const prepared = prepareImport(text);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    await importBackup(target.data, prepared.backup);

    expect(await target.data.exportAll()).toEqual(original.data);
    // Todas las tablas viajaron con datos.
    for (const rows of Object.values(original.data)) expect(rows.length).toBeGreaterThan(0);
  });

  it('el resumen cuenta solo registros activos', async () => {
    const { repos } = await populatedDatabase();
    const prepared = prepareImport(serializeBackup(await createBackup(repos.data, '2026-09-30T12:00:00.000Z')));
    if (!prepared.ok) throw new Error(prepared.error);
    expect(prepared.summary).toMatchObject({
      profileName: 'Camila Rojas',
      accounts: 2,
      fixedExpenses: 1,
      debts: 1,
      budgets: 1,
      savingsGoals: 1,
      // sueldo + pago del arriendo + abono a la deuda (el café eliminado no cuenta)
      transactions: 3,
    });
  });

  it('incluye versión del esquema y fecha', async () => {
    const { repos } = await populatedDatabase();
    const backup = await createBackup(repos.data, '2026-09-30T12:00:00.000Z');
    expect(backup).toMatchObject({ app: 'control-gastos', schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: '2026-09-30T12:00:00.000Z' });
    expect(backupFileName(backup.exportedAt)).toBe('respaldo-control-gastos-2026-09-30.json');
  });

  it('un import fallido no toca los datos actuales', async () => {
    const { repos } = await populatedDatabase();
    const before = await repos.data.exportAll();
    const backup = await createBackup(repos.data, '2026-09-30T12:00:00.000Z');
    // Clave foránea rota: un movimiento apunta a una cuenta inexistente.
    const broken = { ...backup.data, transactions: [{ ...backup.data.transactions[0]!, accountId: 'no-existe' }] };
    await expect(repos.data.replaceAll(broken)).rejects.toThrow();
    expect(await repos.data.exportAll()).toEqual(before);
  });
});

describe('respaldos antiguos', () => {
  it('un respaldo v1 (sin reminderDaysBefore) se migra y se importa', async () => {
    const { repos } = await populatedDatabase();
    const current = await createBackup(repos.data, '2026-09-30T12:00:00.000Z');
    const v1 = {
      ...current,
      schemaVersion: 1,
      data: { ...current.data, settings: current.data.settings.map(({ reminderDaysBefore: _removed, ...row }) => row) },
    };
    const prepared = prepareImport(JSON.stringify(v1));
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(prepared.backup.data.settings[0]?.reminderDaysBefore).toBe(1);

    const target = createSqliteRepositories(createTestContext());
    await importBackup(target.data, prepared.backup);
    expect((await target.settings.get()).theme).toBe('dark');
  });
});

describe('parseBackup', () => {
  it('rechaza archivos que no son respaldos', () => {
    expect(parseBackup('no es json')).toEqual({ ok: false, error: 'El archivo no es un JSON válido.' });
    expect(parseBackup('{"hola":1}')).toEqual({ ok: false, error: 'El archivo no es un respaldo de Control de Gastos.' });
    expect(parseBackup('{"app":"control-gastos"}')).toEqual({ ok: false, error: 'El respaldo no indica su versión.' });
  });

  it('rechaza versiones más nuevas y contenido dañado', () => {
    const newer = parseBackup(JSON.stringify({ app: 'control-gastos', schemaVersion: BACKUP_SCHEMA_VERSION + 1, exportedAt: '', data: {} }));
    expect(newer).toEqual({ ok: false, error: 'Este respaldo es de una versión más nueva de la app. Actualiza la app para importarlo.' });
    const damaged = parseBackup(JSON.stringify({ app: 'control-gastos', schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: '', data: { profile: 'x' } }));
    expect(damaged.ok).toBe(false);
    if (!damaged.ok) expect(damaged.error).toMatch(/^El respaldo está dañado o incompleto/);
  });
});
