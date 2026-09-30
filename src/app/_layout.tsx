import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme as NavigationTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ErrorState, LoadingState } from '@/components';
import { useAppBootstrap } from '@/features/bootstrap/useAppBootstrap';
import { useAutoLock } from '@/features/security/useAutoLock';
import { useSettings } from '@/features/settings/queries';
import { appRepositories } from '@/services/app';
import { createQueryClient } from '@/services/queryClient';
import { RepositoriesProvider } from '@/services/RepositoriesProvider';
import { useSessionStore } from '@/store/sessionStore';
import { AppThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const fontsReady = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <RepositoriesProvider repositories={appRepositories}>
          <AppThemeProvider>
            <RootNavigator />
          </AppThemeProvider>
        </RepositoriesProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { colors, scheme } = useTheme();
  const bootstrap = useAppBootstrap();
  const isOnboarded = useSessionStore((state) => state.isOnboarded);
  const isLocked = useSessionStore((state) => state.isLocked);
  const settings = useSettings();
  const isReady = bootstrap.status === 'ready';

  useAutoLock(settings.data?.lockTimeoutMinutes ?? 0, isReady && isOnboarded && !isLocked);

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
    };
  }, [colors, scheme]);

  if (bootstrap.status === 'loading') return <LoadingState message="Abriendo tus datos…" />;
  if (bootstrap.status === 'error') {
    return <ErrorState message={`No pudimos abrir tus datos. ${bootstrap.message}`} onRetry={bootstrap.retry} />;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!isOnboarded}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={isOnboarded && isLocked}>
          <Stack.Screen name="lock" />
          <Stack.Screen name="olvide-pin" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
        <Stack.Protected guard={isOnboarded && !isLocked}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
