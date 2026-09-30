import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

import { useTheme } from '@/theme';

type ScreenProps = {
  children: ReactNode;
};

/** Contenedor base de las pantallas dentro del drawer (el header ya maneja el área segura superior). */
export function Screen({ children }: ScreenProps) {
  const { colors, spacing } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, flexGrow: 1 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {children}
    </ScrollView>
  );
}
