import type { Profile } from '@/types/models';

import { nameSchema, salarySchema, toProfileInput, toSalaryFormValues, type SalaryFormValues } from '../profileSchema';

const valid: SalaryFormValues = {
  grossSalary: '1.200.000',
  payDay: 25,
  contractType: 'dependiente',
  contractTerm: 'indefinite',
  afpName: 'Modelo',
  afpCommissionPercent: '0,58',
  healthSystem: 'fonasa',
  isapreUfText: '',
  hasUnemploymentInsurance: true,
  otherIncome: '0',
};

function errorsOf(values: SalaryFormValues) {
  const result = salarySchema.safeParse(values);
  if (result.success) return {};
  // Como react-hook-form: el primer mensaje de cada campo.
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) errors[issue.path.join('.')] ??= issue.message;
  return errors;
}

describe('nameSchema', () => {
  it('exige nombre y recorta espacios', () => {
    expect(nameSchema.parse({ name: '  Camila ' })).toEqual({ name: 'Camila' });
    expect(nameSchema.safeParse({ name: '   ' }).error?.issues[0]?.message).toBe('Ingresa tu nombre');
    expect(nameSchema.safeParse({ name: 'x'.repeat(41) }).success).toBe(false);
  });
});

describe('salarySchema', () => {
  it('convierte los textos a números', () => {
    const output = salarySchema.parse(valid);
    expect(output.grossSalary).toBe(1_200_000);
    expect(output.afpCommissionPercent).toBe(0.58);
    expect(output.isapreUfText).toBeNull();
    expect(output.otherIncome).toBe(0);
  });

  it('mensajes en español para montos inválidos', () => {
    expect(errorsOf({ ...valid, grossSalary: '' }).grossSalary).toBe('Ingresa tu sueldo bruto (puede ser 0)');
    expect(errorsOf({ ...valid, grossSalary: '-5' }).grossSalary).toBe('El monto no puede ser negativo');
    expect(errorsOf({ ...valid, grossSalary: '99.999.999.999' }).grossSalary).toBe('Revisa el monto: es demasiado alto');
  });

  it('valida el día de pago', () => {
    expect(errorsOf({ ...valid, payDay: 0 }).payDay).toBe('El día debe estar entre 1 y 31');
    expect(errorsOf({ ...valid, payDay: 32 }).payDay).toBe('El día debe estar entre 1 y 31');
  });

  it('exige AFP a dependientes, no a honorarios', () => {
    expect(errorsOf({ ...valid, afpName: null }).afpName).toBe('Elige tu AFP');
    expect(errorsOf({ ...valid, afpName: null, contractType: 'honorarios' })).toEqual({});
  });

  it('valida la comisión', () => {
    expect(errorsOf({ ...valid, afpCommissionPercent: 'abc' }).afpCommissionPercent).toBe('Ingresa la comisión como número, ej.: 1,44');
    expect(errorsOf({ ...valid, afpCommissionPercent: '7' }).afpCommissionPercent).toBe('Revisa la comisión: máximo 5%');
    expect(salarySchema.parse({ ...valid, afpCommissionPercent: '' }).afpCommissionPercent).toBe(0);
  });

  it('exige el plan en UF con Isapre', () => {
    expect(errorsOf({ ...valid, healthSystem: 'isapre' }).isapreUfText).toBe('Ingresa el valor de tu plan en UF');
    expect(errorsOf({ ...valid, healthSystem: 'isapre', isapreUfText: 'x' }).isapreUfText).toBe('Ingresa el plan en UF, ej.: 3,5');
    expect(salarySchema.parse({ ...valid, healthSystem: 'isapre', isapreUfText: '3,5' }).isapreUfText).toBe(3.5);
  });
});

describe('conversión desde y hacia el perfil', () => {
  it('toProfileInput limpia campos que no aplican a honorarios', () => {
    const output = salarySchema.parse({ ...valid, contractType: 'honorarios', healthSystem: 'isapre', isapreUfText: '2' });
    expect(toProfileInput('Ana', output, null)).toMatchObject({
      contractType: 'honorarios',
      afpName: null,
      afpCommissionRate: 0,
      isapreUf: null,
      hasUnemploymentInsurance: false,
    });
  });

  it('ida y vuelta mantiene los valores', () => {
    const output = salarySchema.parse({ ...valid, healthSystem: 'isapre', isapreUfText: '3,25' });
    const input = toProfileInput('Camila', output, 'file:///foto.jpg');
    expect(input.afpCommissionRate).toBeCloseTo(0.0058, 10);
    const profile: Profile = { ...input, id: '1', createdAt: '', updatedAt: '', deletedAt: null };
    expect(toSalaryFormValues(profile)).toEqual({ ...valid, healthSystem: 'isapre', isapreUfText: '3,25' });
  });

  it('valores vacíos para un perfil nuevo', () => {
    expect(toSalaryFormValues(null)).toMatchObject({ grossSalary: '', payDay: 1, afpName: null, otherIncome: '0' });
  });
});
