import type { TextStyle } from 'react-native';

/** Escala de espaciado (px). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Radios de esquina (px). */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Tamaño táctil mínimo recomendado (accesibilidad). */
export const MIN_TOUCH_TARGET = 44;

/** Familias de Inter cargadas en `app/_layout.tsx`. */
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export type TextVariant =
  | 'display'
  | 'amount'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption';

/** Jerarquía tipográfica. `display` y `amount` son para montos grandes. */
export const typography: Record<TextVariant, TextStyle> = {
  display: { fontFamily: fontFamily.bold, fontSize: 36, lineHeight: 44, letterSpacing: -0.5 },
  amount: { fontFamily: fontFamily.semibold, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  title: { fontFamily: fontFamily.semibold, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
};
