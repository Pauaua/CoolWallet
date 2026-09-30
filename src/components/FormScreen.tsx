import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

type FormScreenProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Acciones fijas abajo (ej.: botón Continuar). */
  footer?: ReactNode;
  /** `true` si la pantalla no tiene header de navegación arriba. */
  withTopInset?: boolean;
};

/** Pantalla de formulario: contenido desplazable, se ajusta al teclado y deja las acciones abajo. */
export function FormScreen({ title, subtitle, children, footer, withTopInset = false }: FormScreenProps) {
  const { colors, spacing } = useTheme();
  return (
    <SafeAreaView edges={withTopInset ? ['top', 'bottom'] : ['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {title ? (
            <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
              <AppText variant="title" accessibilityRole="header">
                {title}
              </AppText>
              {subtitle ? <AppText color="textSecondary">{subtitle}</AppText> : null}
            </View>
          ) : null}
          {children}
        </ScrollView>
        {footer ? <View style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.sm }}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
