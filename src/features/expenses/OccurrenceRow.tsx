import { Pressable, View } from 'react-native';

import { AppText, ColorIcon, Icon, IconButton } from '@/components';
import { formatShortDate } from '@/lib/dates';
import { daysUntil, formatCLP } from '@/lib/finance';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';
import type { Category } from '@/types/models';

import type { FixedOccurrenceRow } from './expensesAnalysis';
import { OCCURRENCE_STATUS_META } from './labels';

type OccurrenceRowProps = {
  row: FixedOccurrenceRow;
  category?: Category;
  today: string;
  busy: boolean;
  onTogglePaid: () => void;
  onPress: () => void;
};

/** Un vencimiento de gasto fijo: estado (texto + ícono + color), monto y botón para marcar pagado. */
export function OccurrenceRow({ row, category, today, busy, onTogglePaid, onPress }: OccurrenceRowProps) {
  const { spacing } = useTheme();
  const meta = OCCURRENCE_STATUS_META[row.status];
  const statusLabel = meta.label(daysUntil(row.occurrence.dueDate, today));
  const name = row.expense?.name ?? 'Gasto fijo eliminado';
  const isPaid = row.status === 'paid';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: MIN_TOUCH_TARGET + 16 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${formatCLP(row.occurrence.amount)}, vence el ${formatShortDate(row.occurrence.dueDate)}. ${statusLabel}`}
        accessibilityHint="Editar el gasto fijo"
        onPress={onPress}
        disabled={!row.expense}
        style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, opacity: pressed ? 0.6 : 1 })}
      >
        <ColorIcon icon={category?.icon ?? 'repeat'} colorKey={category?.color ?? 'slate'} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {name}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Icon name={meta.icon} size={14} color={meta.color} />
            <AppText variant="caption" color={meta.color}>
              {statusLabel}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              · {formatShortDate(row.occurrence.dueDate)}
            </AppText>
          </View>
        </View>
        <AppText variant="bodyStrong" color={isPaid ? 'textSecondary' : 'text'}>
          {formatCLP(row.occurrence.amount)}
        </AppText>
      </Pressable>
      <IconButton
        icon={isPaid ? 'check-circle' : 'circle'}
        color={isPaid ? 'primary' : 'textSecondary'}
        accessibilityLabel={isPaid ? `Marcar ${name} como pendiente` : `Marcar ${name} como pagado`}
        onPress={busy ? () => undefined : onTogglePaid}
      />
    </View>
  );
}
