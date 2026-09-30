import { Text, type TextProps } from 'react-native';

import { useTheme, type ColorTokens, type TextVariant } from '@/theme';

type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: keyof ColorTokens;
  align?: 'left' | 'center' | 'right';
};

/** Texto con la tipografía y los colores del tema. */
export function AppText({ variant = 'body', color = 'text', align, style, ...rest }: AppTextProps) {
  const { colors, typography } = useTheme();
  return (
    <Text
      style={[typography[variant], { color: colors[color] }, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
