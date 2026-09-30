import { router, Stack } from 'expo-router';

import { IconButton } from '@/components';
import { useTheme } from '@/theme';

/** Formularios que se abren sobre la app (ingreso, ajuste, cuenta, movimiento). */
export default function ModalsLayout() {
  const { colors, typography } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: typography.heading,
        contentStyle: { backgroundColor: colors.background },
        headerLeft: () => <IconButton icon="x" accessibilityLabel="Cerrar" onPress={() => router.back()} />,
      }}
    >
      <Stack.Screen name="nuevo-ingreso" options={{ title: 'Ingreso extra' }} />
      <Stack.Screen name="ajustar-saldo" options={{ title: 'Ajustar saldo' }} />
      <Stack.Screen name="cuenta" options={{ title: 'Cuenta' }} />
      <Stack.Screen name="movimiento/[id]" options={{ title: 'Movimiento' }} />
      <Stack.Screen name="gasto-rapido" options={{ title: 'Gasto variable' }} />
      <Stack.Screen name="gasto-fijo" options={{ title: 'Gasto fijo' }} />
      <Stack.Screen name="categoria" options={{ title: 'Categoría' }} />
    </Stack>
  );
}
