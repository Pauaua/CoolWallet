import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme';

/** Superficie con borde sutil y sombra mínima. */
export function Card({ style, ...rest }: ViewProps) {
  const { colors, radius, spacing, scheme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.lg,
          shadowColor: colors.shadow,
          shadowOpacity: scheme === 'dark' ? 0 : 0.04,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: scheme === 'dark' ? 0 : 1,
        },
        style,
      ]}
      {...rest}
    />
  );
}
