import type { SavingsGoal } from '@/types/models';

import { buildGoalsSummary, buildGoalView } from '../goalModel';
import { contributionSchema, goalSchema } from '../schemas';

const stamp = { createdAt: '', updatedAt: '', deletedAt: null };
const goal = (id: string, targetAmount: number, savedAmount: number, targetDate: string | null): SavingsGoal => ({
  id,
  name: id,
  targetAmount,
  savedAmount,
  targetDate,
  icon: 'target',
  color: 'forest',
  ...stamp,
});

describe('buildGoalView', () => {
  it('avance y plan mensual', () => {
    const view = buildGoalView(goal('trip', 1_000_000, 100_000, '2026-12-31'), '2026-09-30');
    expect(view.progress).toEqual({ percentage: 10, remaining: 900_000, isComplete: false });
    expect(view.plan).toEqual({ monthlyAmount: 300_000, remaining: 900_000, monthsRemaining: 3, isOverdue: false });
  });

  it('sin fecha no hay plan', () => {
    expect(buildGoalView(goal('fund', 500_000, 0, null), '2026-09-30').plan).toBeNull();
  });
});

describe('buildGoalsSummary', () => {
  it('ordena en curso por fecha y suma lo necesario al mes', () => {
    const summary = buildGoalsSummary(
      [goal('done', 100, 100, '2026-10-01'), goal('later', 600_000, 0, '2027-03-31'), goal('soon', 1_000_000, 100_000, '2026-12-31'), goal('open', 50_000, 0, null)],
      '2026-09-30',
    );
    expect(summary.views.map((view) => view.goal.id)).toEqual(['soon', 'later', 'open', 'done']);
    expect(summary.monthlyNeeded).toBe(300_000 + 100_000);
    expect(summary.totalSaved).toBe(100_100);
    expect(summary.totalTarget).toBe(1_650_100);
  });
});

describe('esquemas de metas', () => {
  it('valida la meta', () => {
    expect(goalSchema.parse({ name: ' Viaje ', targetAmount: '800.000', savedAmount: '0', targetDate: '', icon: 'sun', color: 'sky' })).toMatchObject({
      name: 'Viaje',
      targetAmount: 800_000,
      savedAmount: 0,
      targetDate: '',
    });
    const errors = goalSchema.safeParse({ name: '', targetAmount: '0', savedAmount: '', targetDate: 'mañana', icon: 'sun', color: 'sky' }).error?.issues.map((issue) => issue.message);
    expect(errors).toEqual(['Ponle un nombre, ej.: Vacaciones', 'El monto debe ser mayor a $0', 'Ingresa cuánto llevas (puede ser 0)', 'Elige una fecha válida']);
  });

  it('valida el aporte', () => {
    expect(contributionSchema.parse({ amount: '20.000', direction: 'withdraw' })).toEqual({ amount: 20_000, direction: 'withdraw' });
    expect(contributionSchema.safeParse({ amount: '0', direction: 'add' }).success).toBe(false);
  });
});
