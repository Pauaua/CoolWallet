import type { IconName } from '@/components/Icon';
import type { DebtKind, DebtRiskLevel, DebtStatus } from '@/lib/finance';
import type { ColorTokens } from '@/theme';

export const DEBT_KIND_OPTIONS: readonly { value: DebtKind; label: string; plural: string; description: string; icon: IconName }[] = [
  { value: 'installment', label: 'En cuotas', plural: 'En cuotas', description: 'Créditos de consumo, automotriz, compras en cuotas', icon: 'calendar' },
  { value: 'pending', label: 'Pendiente', plural: 'Pendientes', description: 'Le debes a alguien o un pago atrasado', icon: 'user' },
  { value: 'variable', label: 'Variable', plural: 'Variables', description: 'Gasto de tarjeta del mes, préstamo puntual', icon: 'shuffle' },
];

export function getDebtKindOption(kind: DebtKind) {
  return DEBT_KIND_OPTIONS.find((option) => option.value === kind) ?? DEBT_KIND_OPTIONS[0]!;
}

/** Estado con texto, ícono y color (nunca solo color). */
export const DEBT_STATUS_META: Record<DebtStatus, { label: string; icon: IconName; color: keyof ColorTokens }> = {
  paid: { label: 'Pagada', icon: 'check-circle', color: 'primary' },
  on_time: { label: 'Al día', icon: 'check', color: 'primary' },
  due_soon: { label: 'Por vencer', icon: 'clock', color: 'warningText' },
  overdue: { label: 'Vencida', icon: 'alert-circle', color: 'danger' },
};

/** Semáforo del ratio deuda/ingreso. */
export const DEBT_RISK_META: Record<DebtRiskLevel, { label: string; description: string; icon: IconName; color: keyof ColorTokens }> = {
  low: { label: 'Saludable', description: 'Tus cuotas usan menos del 30% de tu ingreso.', icon: 'check-circle', color: 'primary' },
  medium: { label: 'Precaución', description: 'Entre 30% y 40% de tu ingreso va a cuotas. Evita sumar deudas.', icon: 'alert-triangle', color: 'warningText' },
  high: { label: 'Riesgo alto', description: 'Más del 40% de tu ingreso va a cuotas. Prioriza pagar.', icon: 'alert-octagon', color: 'danger' },
  unknown: { label: 'Sin datos', description: 'Completa tu sueldo en el perfil para calcular el ratio.', icon: 'help-circle', color: 'textSecondary' },
};
