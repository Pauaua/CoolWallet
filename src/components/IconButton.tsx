import { Pressable, StyleSheet } from 'react-native';

import { MIN_TOUCH_TARGET, useTheme, type ColorTokens } from '@/theme';

import { Icon, type IconName } from './Icon';

type IconButtonProps = {
  icon: IconName;
  /** Obligatorio: el botón no tiene texto visible. */
  accessibilityLabel: string;
  onPress: () => void;
  color?: keyof ColorTokens;
  size?: number;
};

export function IconButton({ icon, accessibilityLabel, onPress, color = 'text', size = 22 }: IconButtonProps) {
  const { radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.base, { borderRadius: radius.pill, opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon name={icon} color={color} size={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
