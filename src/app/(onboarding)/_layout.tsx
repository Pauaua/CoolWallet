import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function OnboardingLayout() {
  const { colors, typography } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { ...typography.label, color: colors.textSecondary },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="nombre" options={{ title: 'Paso 1 de 4' }} />
      <Stack.Screen name="sueldo" options={{ title: 'Paso 2 de 4' }} />
      <Stack.Screen name="pin" options={{ title: 'Paso 3 de 4' }} />
      <Stack.Screen name="biometria" options={{ title: 'Paso 4 de 4', headerBackVisible: false, gestureEnabled: false }} />
    </Stack>
  );
}
