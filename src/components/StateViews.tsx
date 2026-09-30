import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { EmptyState } from './EmptyState';

/** Indicador de carga centrado. */
export function LoadingState({ message = 'Cargando…' }: { message?: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={message} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} size="large" />
      <AppText color="textSecondary">{message}</AppText>
    </View>
  );
}

/** Error amable con opción de reintentar. */
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="alert-circle"
      title="Algo no salió bien"
      description={message ?? 'No pudimos cargar tus datos. Intenta de nuevo.'}
      action={onRetry ? { label: 'Reintentar', onPress: onRetry } : undefined}
    />
  );
}
