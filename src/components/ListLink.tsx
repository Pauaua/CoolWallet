import { Pressable, View } from 'react-native';

import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type ListLinkProps = {
  icon: IconName;
  title: string;
  description?: string;
  onPress: () => void;
};

/** Fila navegable con ícono, texto y flecha. */
export function ListLink({ icon, title, description, onPress }: ListLinkProps) {
  const { spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: MIN_TOUCH_TARGET + 12,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icon} color="primary" />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{title}</AppText>
        {description ? (
          <AppText variant="caption" color="textSecondary">
            {description}
          </AppText>
        ) : null}
      </View>
      <Icon name="chevron-right" color="textSecondary" size={18} />
    </Pressable>
  );
}
