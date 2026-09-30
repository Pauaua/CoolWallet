import { router } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Avatar, Button } from '@/components';
import { useProfile } from '@/features/profile/queries';
import { PinEntry } from '@/features/security/PinEntry';
import { requestBiometricAuth, useBiometricSupport } from '@/features/security/useBiometrics';
import { useSettings } from '@/features/settings/queries';
import { useSessionStore } from '@/store/sessionStore';
import { useTheme } from '@/theme';

/** Pantalla de bloqueo: PIN o huella/Face ID. */
export default function LockScreen() {
  const { colors, spacing } = useTheme();
  const unlock = useSessionStore((state) => state.unlock);
  const profile = useProfile();
  const settings = useSettings();
  const support = useBiometricSupport();
  const autoPrompted = useRef(false);

  const canUseBiometrics = Boolean(settings.data?.biometricsEnabled && support.data?.available);
  const biometricLabel = support.data?.label ?? 'biometría';

  const tryBiometrics = useCallback(async () => {
    if (await requestBiometricAuth()) unlock();
  }, [unlock]);

  // Al llegar a la pantalla se ofrece la biometría una vez automáticamente.
  useEffect(() => {
    if (canUseBiometrics && !autoPrompted.current) {
      autoPrompted.current = true;
      void tryBiometrics();
    }
  }, [canUseBiometrics, tryBiometrics]);

  const name = profile.data?.name ?? '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl }}>
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <Avatar name={name} photoUri={profile.data?.photoUri} size={72} />
          <AppText variant="title" align="center">
            {name ? `Hola, ${name.split(' ')[0]}` : 'Hola'}
          </AppText>
        </View>

        <PinEntry
          title="App bloqueada"
          onSuccess={unlock}
          extraAction={canUseBiometrics ? { icon: 'unlock', accessibilityLabel: `Usar ${biometricLabel}`, onPress: () => void tryBiometrics() } : undefined}
        />

        <Button label="Olvidé mi PIN" variant="ghost" onPress={() => router.push('/olvide-pin')} />
      </ScrollView>
    </SafeAreaView>
  );
}
