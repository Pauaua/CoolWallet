import { Pressable, View } from 'react-native';

import { AppText, Card, Icon, ProgressBar } from '@/components';
import { formatShortDate } from '@/lib/dates';
import { formatCLP } from '@/lib/finance';
import { useTheme } from '@/theme';

import type { DebtView } from './debtModel';
import { DEBT_STATUS_META, getDebtKindOption } from './labels';

type DebtCardProps = {
  view: DebtView;
  onPress: () => void;
};

/** Tarjeta de una deuda: saldo, avance, estado y próximo vencimiento. */
export function DebtCard({ view, onPress }: DebtCardProps) {
  const { spacing } = useTheme();
  const { debt } = view;
  const status = DEBT_STATUS_META[view.status];
  const kind = getDebtKindOption(debt.kind);
  const detail =
    debt.kind === 'installment'
      ? `Cuota ${Math.min(view.installmentsPaid + 1, debt.installmentsTotal ?? 0)} de ${debt.installmentsTotal ?? 0} · ${formatCLP(view.installmentAmount)}`
      : debt.creditor
        ? `A ${debt.creditor}`
        : kind.label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${debt.name}. Debes ${formatCLP(view.remainingBalance)}. ${status.label}${view.nextDueDate ? `, vence el ${formatShortDate(view.nextDueDate)}` : ''}`}
      accessibilityHint="Ver detalle y registrar pagos"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {debt.name}
            </AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {detail}
            </AppText>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <AppText variant="bodyStrong">{formatCLP(view.remainingBalance)}</AppText>
            <AppText variant="caption" color="textSecondary">
              por pagar
            </AppText>
          </View>
        </View>
        <ProgressBar value={view.progress} accessibilityLabel={`Avance del pago de ${debt.name}`} height={8} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Icon name={status.icon} size={14} color={status.color} />
          <AppText variant="caption" color={status.color}>
            {status.label}
          </AppText>
          {view.nextDueDate ? (
            <AppText variant="caption" color="textSecondary">
              · vence {formatShortDate(view.nextDueDate)}
            </AppText>
          ) : null}
          <View style={{ flex: 1 }} />
          <AppText variant="caption" color="textSecondary">
            {Math.round(view.progress)}% pagado
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}
