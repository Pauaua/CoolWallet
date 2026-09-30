import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import { resolveCategoryColor, useTheme } from '@/theme';

import type { IconName } from './Icon';

type ColorIconProps = {
  /** Nombre de ícono Feather guardado en la base. */
  icon: string;
  /** Clave de la paleta de categorías (ej. "forest"). */
  colorKey: string;
  size?: number;
};

function isIconName(name: string): name is IconName {
  return name in Feather.glyphMap;
}

/** Ícono de categoría o cuenta dentro de un círculo con su color. Decorativo. */
export function ColorIcon({ icon, colorKey, size = 40 }: ColorIconProps) {
  const { scheme, colors } = useTheme();
  const color = resolveCategoryColor(colorKey, scheme);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.background, borderWidth: 1.5, borderColor: color, alignItems: 'center', justifyContent: 'center' }}
    >
      <Feather name={isIconName(icon) ? icon : 'tag'} size={size * 0.45} color={color} />
    </View>
  );
}
