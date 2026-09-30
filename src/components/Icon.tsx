import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

import { useTheme, type ColorTokens } from '@/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

type IconProps = {
  name: IconName;
  size?: number;
  color?: keyof ColorTokens;
};

/** Ícono de línea (Feather) con color del tema. Decorativo: no se anuncia al lector de pantalla. */
export function Icon({ name, size = 22, color = 'text' }: IconProps) {
  const { colors } = useTheme();
  return (
    <Feather
      name={name}
      size={size}
      color={colors[color]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
