import { Pressable, View } from 'react-native';

import { useTheme, type ColorTokens } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';
import { Icon, type IconName } from './Icon';

type StatCardProps = {
  label: string;
  value: string;
  icon: IconName;
  caption?: string;
  valueColor?: keyof ColorTokens;
  onPress?: () => void;
};

/** Tarjeta con una cifra destacada (resúmenes de Inicio y Billetera). */
export function StatCard({ label, value, icon, caption, valueColor = 'text', onPress }: StatCardProps) {
  const { spacing } = useTheme();
  const content = (
    <Card style={{ gap: spacing.sm, flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Icon name={icon} size={16} color="primary" />
        <AppText variant="caption" color="textSecondary" style={{ flex: 1 }} numberOfLines={1}>
          {label}
        </AppText>
        {onPress ? <Icon name="chevron-right" size={16} color="textSecondary" /> : null}
      </View>
      <AppText variant="amount" color={valueColor} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      {caption ? (
        <AppText variant="caption" color="textSecondary" numberOfLines={2}>
          {caption}
        </AppText>
      ) : null}
    </Card>
  );

  if (!onPress) return <View style={{ flex: 1 }}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}${caption ? `. ${caption}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
    >
      {content}
    </Pressable>
  );
}
