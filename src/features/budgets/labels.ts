import type { IconName } from '@/components/Icon';
import type { BudgetAlertLevel, BudgetGroupKey } from '@/lib/finance';
import type { ColorTokens } from '@/theme';

export const BUDGET_GROUP_LABELS: Record<BudgetGroupKey, { label: string; percent: number; description: string }> = {
  needs: { label: 'Necesidades', percent: 50, description: 'Arriendo, cuentas, supermercado, transporte' },
  wants: { label: 'Deseos', percent: 30, description: 'Salidas, delivery, suscripciones' },
  savings: { label: 'Ahorro', percent: 20, description: 'Lo que te queda tras tus gastos' },
};

/** Color de barra, ícono y texto de cada nivel (nunca solo color). */
export const BUDGET_LEVEL_META: Record<BudgetAlertLevel, { bar: keyof ColorTokens; text: keyof ColorTokens; icon: IconName }> = {
  none: { bar: 'accent', text: 'textSecondary', icon: 'circle' },
  ok: { bar: 'accent', text: 'textSecondary', icon: 'check' },
  warning: { bar: 'warning', text: 'warningText', icon: 'alert-triangle' },
  exceeded: { bar: 'danger', text: 'danger', icon: 'alert-octagon' },
};
