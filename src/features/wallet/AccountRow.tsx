import { Pressable, View } from 'react-native';

import { AppText, ColorIcon } from '@/components';
import { formatCLP } from '@/lib/finance';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { getAccountTypeOption } from './labels';
import type { AccountWithBalance } from './walletSummary';

type AccountRowProps = {
  account: AccountWithBalance;
  onPress: () => void;
};

export function AccountRow({ account, onPress }: AccountRowProps) {
  const { spacing } = useTheme();
  const typeLabel = getAccountTypeOption(account.type).label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${account.name}, ${typeLabel}, saldo ${formatCLP(account.balance)}`}
      accessibilityHint="Editar la cuenta"
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH_TARGET + 12, opacity: pressed ? 0.6 : 1 })}
    >
      <ColorIcon icon={account.icon} colorKey={account.color} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {account.name}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {typeLabel}
        </AppText>
      </View>
      <AppText variant="bodyStrong" color={account.balance < 0 ? 'danger' : 'text'}>
        {formatCLP(account.balance)}
      </AppText>
    </Pressable>
  );
}
