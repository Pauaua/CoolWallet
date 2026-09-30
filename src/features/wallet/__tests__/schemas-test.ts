import { accountSchema, adjustmentSchema, movementSchema } from '../schemas';

function firstErrors(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  const errors: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) errors[issue.path.join('.')] ??= issue.message;
  return errors;
}

describe('movementSchema', () => {
  const valid = { amount: '25.000', date: '2026-09-30', accountId: 'main', categoryId: null, note: '  Venta  ' };

  it('convierte monto y limpia la nota', () => {
    expect(movementSchema.parse(valid)).toEqual({ amount: 25_000, date: '2026-09-30', accountId: 'main', categoryId: null, note: 'Venta' });
    expect(movementSchema.parse({ ...valid, note: '   ' }).note).toBeNull();
  });

  it('exige monto mayor a 0, cuenta y fecha válida', () => {
    const errors = firstErrors(movementSchema.safeParse({ ...valid, amount: '0', accountId: '', date: '30/09/2026' }));
    expect(errors).toEqual({
      amount: 'El monto debe ser mayor a $0',
      accountId: 'Elige una cuenta',
      date: 'Elige una fecha válida',
    });
    expect(firstErrors(movementSchema.safeParse({ ...valid, amount: '' })).amount).toBe('Ingresa el monto');
    expect(firstErrors(movementSchema.safeParse({ ...valid, amount: 'abc' })).amount).toBe('Ingresa el monto');
  });

  it('limita el largo de la nota', () => {
    expect(firstErrors(movementSchema.safeParse({ ...valid, note: 'x'.repeat(121) })).note).toBe('Usa máximo 120 caracteres');
  });
});

describe('adjustmentSchema', () => {
  it('aplica el signo del saldo real', () => {
    expect(adjustmentSchema.parse({ accountId: 'card', realBalance: '150.000', isNegative: true, note: '' })).toEqual({ accountId: 'card', realBalance: -150_000, note: null });
    expect(adjustmentSchema.parse({ accountId: 'main', realBalance: '0', isNegative: false, note: '' }).realBalance).toBe(0);
  });
});

describe('accountSchema', () => {
  it('valida nombre y aplica el signo del saldo inicial', () => {
    expect(accountSchema.parse({ name: ' Visa ', type: 'credit_card', initialBalance: '80.000', isNegative: true })).toEqual({
      name: 'Visa',
      type: 'credit_card',
      initialBalance: -80_000,
    });
    expect(firstErrors(accountSchema.safeParse({ name: '', type: 'cash', initialBalance: '', isNegative: false }))).toEqual({
      name: 'Ponle un nombre a la cuenta',
      initialBalance: 'Ingresa el saldo inicial (puede ser 0)',
    });
  });
});
