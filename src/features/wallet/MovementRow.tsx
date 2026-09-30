import { Pressable, View } from 'react-native';

import { AppText, ColorIcon } from '@/components';
import { formatShortDate } from '@/lib/dates';
import { formatCLP, signedAmount } from '@/lib/finance';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';
import type { Account, Category, Transaction } from '@/types/models';

import { TRANSACTION_TYPE_ICONS, TRANSACTION_TYPE_LABELS } from './labels';

type MovementRowProps = {
  transaction: Transaction;
  category?: Category;
  account?: Account;
  onPress: () => void;
};

/** Un movimiento: ícono de la categoría, descripción, cuenta y fecha, y monto con signo. */
export function MovementRow({ transaction, category, account, onPress }: MovementRowProps) {
  const { spacing } = useTheme();
  const effect = signedAmount(transaction);
  const title = transaction.note ?? category?.name ?? TRANSACTION_TYPE_LABELS[transaction.type];
  const subtitle = [category && transaction.note ? category.name : TRANSACTION_TYPE_LABELS[transaction.type], account?.name, formatShortDate(transaction.date)]
    .filter(Boolean)
    .join(' · ');
  const amountLabel = `${effect > 0 ? '+' : ''}${formatCLP(effect)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${amountLabel}. ${subtitle}`}
      accessibilityHint="Editar o eliminar el movimiento"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: MIN_TOUCH_TARGET + 16,
        paddingVertical: spacing.sm,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <ColorIcon icon={category?.icon ?? TRANSACTION_TYPE_ICONS[transaction.type]} colorKey={category?.color ?? 'slate'} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      <AppText variant="bodyStrong" color={effect > 0 ? 'primary' : 'text'}>
        {amountLabel}
      </AppText>
    </Pressable>
  );
}
