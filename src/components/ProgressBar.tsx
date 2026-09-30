import { View } from 'react-native';

import { useTheme, type ColorTokens } from '@/theme';

type ProgressBarProps = {
  /** Porcentaje 0–100 (se limita a ese rango al dibujar). */
  value: number;
  color?: keyof ColorTokens;
  accessibilityLabel: string;
  height?: number;
};

export function ProgressBar({ value, color = 'accent', accessibilityLabel, height = 10 }: ProgressBarProps) {
  const { colors, radius } = useTheme();
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={{ height, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' }}
    >
      <View style={{ width: `${clamped}%`, height: '100%', borderRadius: radius.pill, backgroundColor: colors[color] }} />
    </View>
  );
}
