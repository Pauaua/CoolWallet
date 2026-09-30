import { categorySchema, fixedExpenseSchema } from '../schemas';

const firstErrors = (issues: { path: PropertyKey[]; message: string }[] = []) => {
  const errors: Record<string, string> = {};
  for (const issue of issues) errors[issue.path.join('.')] ??= issue.message;
  return errors;
};

describe('fixedExpenseSchema', () => {
  const valid = {
    name: ' Arriendo ',
    amount: '450.000',
    categoryId: 'home',
    accountId: null,
    dueDay: 5,
    frequency: 'monthly' as const,
    startDate: '2026-09-01',
    active: true,
    note: '',
  };

  it('convierte y limpia', () => {
    expect(fixedExpenseSchema.parse(valid)).toEqual({ ...valid, name: 'Arriendo', amount: 450_000, note: null });
  });

  it('mensajes en español', () => {
    const result = fixedExpenseSchema.safeParse({ ...valid, name: '', amount: '0', dueDay: NaN });
    expect(firstErrors(result.error?.issues)).toEqual({
      name: 'Ponle un nombre, ej.: Arriendo',
      amount: 'El monto debe ser mayor a $0',
      dueDay: 'Ingresa el día de vencimiento',
    });
    expect(firstErrors(fixedExpenseSchema.safeParse({ ...valid, dueDay: 40 }).error?.issues).dueDay).toBe('El día debe estar entre 1 y 31');
  });
});

describe('categorySchema', () => {
  it('valida nombre, color y grupo', () => {
    expect(categorySchema.parse({ name: ' Mascotas ', kind: 'variable', icon: 'heart', color: 'olive', budgetGroup: 'needs' }).name).toBe('Mascotas');
    expect(firstErrors(categorySchema.safeParse({ name: '', kind: 'variable', icon: 'heart', color: 'olive', budgetGroup: null }).error?.issues)).toEqual({
      name: 'Ponle un nombre a la categoría',
    });
    expect(categorySchema.safeParse({ name: 'X', kind: 'variable', icon: 'heart', color: 'blanco', budgetGroup: null }).success).toBe(false);
  });
});
