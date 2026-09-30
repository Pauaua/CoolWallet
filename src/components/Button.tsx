import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH_TARGET, useTheme, type ColorTokens } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** `primary`: acción principal · `secondary`: con borde · `ghost`: solo texto · `danger`: destructiva. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
};

const VARIANT_COLORS: Record<NonNullable<ButtonProps['variant']>, { background: keyof ColorTokens | null; border: keyof ColorTokens | null; content: keyof ColorTokens }> = {
  primary: { background: 'primary', border: 'primary', content: 'onPrimary' },
  secondary: { background: 'surface', border: 'border', content: 'primary' },
  ghost: { background: null, border: null, content: 'primary' },
  danger: { background: 'danger', border: 'danger', content: 'onPrimary' },
};

export function Button({ label, onPress, variant = 'primary', icon, disabled = false, loading = false }: ButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const palette = VARIANT_COLORS[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: radius.md,
          paddingHorizontal: spacing.xl,
          backgroundColor: palette.background ? colors[palette.background] : 'transparent',
          borderColor: palette.border ? colors[palette.border] : 'transparent',
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.content, { gap: spacing.sm }]}>
        {loading ? (
          <ActivityIndicator size="small" color={colors[palette.content]} />
        ) : icon ? (
          <Icon name={icon} size={18} color={palette.content} />
        ) : null}
        <AppText variant="bodyStrong" color={palette.content}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_TARGET + 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
