import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, Button, Card, Divider, ErrorState, Icon, LoadingState, Notice, Screen, SegmentedControl, SwitchRow } from '@/components';
import { LOCK_TIMEOUT_OPTIONS } from '@/features/security/autoLock';
import { confirmWipe } from '@/features/security/confirmWipe';
import { requestBiometricAuth, useBiometricSupport } from '@/features/security/useBiometrics';
import { useResetApp } from '@/features/security/useResetApp';
import { useSettings, useUpdateSettings } from '@/features/settings/queries';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

export default function SecurityScreen() {
  const { spacing } = useTheme();
  const settings = useSettings();
  const update = useUpdateSettings();
  const support = useBiometricSupport();
  const reset = useResetApp();
  const [biometricError, setBiometricError] = useState<string | null>(null);

  if (settings.isPending) return <LoadingState />;
  if (settings.isError) return <ErrorState onRetry={() => void settings.refetch()} />;

  const label = support.data?.label ?? 'biometría';
  const available = support.data?.available ?? false;

  const toggleBiometrics = async (enabled: boolean) => {
    setBiometricError(null);
    if (enabled && !(await requestBiometricAuth(`Activar ${label}`))) {
      setBiometricError(`No pudimos verificar tu ${label}.`);
      return;
    }
    update.mutate({ biometricsEnabled: enabled });
  };

  return (
    <Screen>
      <Card style={{ padding: 0 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/cambiar-pin')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            minHeight: MIN_TOUCH_TARGET + 12,
            paddingHorizontal: spacing.lg,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name="key" color="primary" />
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            Cambiar PIN
          </AppText>
          <Icon name="chevron-right" color="textSecondary" size={18} />
        </Pressable>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <SwitchRow
          label={`Desbloquear con ${label}`}
          description={available ? 'Siempre podrás entrar con tu PIN.' : 'Tu teléfono no tiene huella ni Face ID configurado.'}
          value={settings.data.biometricsEnabled && available}
          onValueChange={(value) => void toggleBiometrics(value)}
          disabled={!available || update.isPending}
        />
        {biometricError ? <Notice tone="warning" message={biometricError} /> : null}
        <Divider />
        <View style={{ gap: spacing.sm }}>
          <AppText variant="bodyStrong">Bloqueo automático</AppText>
          <AppText variant="caption" color="textSecondary">
            Tiempo en segundo plano antes de pedir el PIN otra vez.
          </AppText>
          <SegmentedControl
            accessibilityLabel="Bloqueo automático"
            options={LOCK_TIMEOUT_OPTIONS}
            value={settings.data.lockTimeoutMinutes}
            onChange={(lockTimeoutMinutes) => update.mutate({ lockTimeoutMinutes })}
          />
        </View>
      </Card>

      {update.isError ? <Notice tone="danger" message="No pudimos guardar el cambio. Intenta de nuevo." /> : null}

      <Card style={{ gap: spacing.md }}>
        <AppText variant="bodyStrong">Borrar todos los datos</AppText>
        <AppText variant="caption" color="textSecondary">
          Elimina tu perfil, movimientos, deudas, metas y el PIN de este teléfono. No se puede deshacer.
        </AppText>
        <Button label="Borrar todos los datos" icon="trash-2" variant="danger" loading={reset.isPending} onPress={() => confirmWipe(() => reset.mutate())} />
        {reset.isError ? <Notice tone="danger" message="No pudimos borrar los datos. Intenta de nuevo." /> : null}
      </Card>
    </Screen>
  );
}
