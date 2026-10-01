import { calcGoalProgress, calcMonthlySavingNeeded, sumAmounts, type GoalProgress, type IsoDate, type MonthlySavingPlan } from '@/lib/finance';
import type { SavingsGoal } from '@/types/models';

export type GoalView = {
  goal: SavingsGoal;
  progress: GoalProgress;
  /** Plan mensual, o `null` si la meta no tiene fecha. */
  plan: MonthlySavingPlan | null;
};

export function buildGoalView(goal: SavingsGoal, today: IsoDate): GoalView {
  return {
    goal,
    progress: calcGoalProgress(goal.savedAmount, goal.targetAmount),
    plan: goal.targetDate ? calcMonthlySavingNeeded(goal.targetAmount, goal.savedAmount, goal.targetDate, today) : null,
  };
}

export type GoalsSummary = {
  /** En curso primero (por fecha), luego cumplidas. */
  views: GoalView[];
  totalSaved: number;
  totalTarget: number;
  /** Suma de lo que hay que ahorrar al mes en las metas en curso con fecha. */
  monthlyNeeded: number;
};

export function buildGoalsSummary(goals: readonly SavingsGoal[], today: IsoDate): GoalsSummary {
  const views = goals
    .map((goal) => buildGoalView(goal, today))
    .sort((a, b) => Number(a.progress.isComplete) - Number(b.progress.isComplete) || (a.goal.targetDate ?? '9999').localeCompare(b.goal.targetDate ?? '9999'));
  const pending = views.filter((view) => !view.progress.isComplete);
  return {
    views,
    totalSaved: sumAmounts(goals.map((goal) => goal.savedAmount)),
    totalTarget: sumAmounts(goals.map((goal) => goal.targetAmount)),
    monthlyNeeded: sumAmounts(pending.map((view) => view.plan?.monthlyAmount ?? 0)),
  };
}
