import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, FormScreen, Icon, Notice } from '@/components';
import { useCompleteOnboarding } from '@/features/onboarding/useCompleteOnboarding';
import { requestBiometricAuth, useBiometricSupport } from '@/features/security/useBiometrics';
import { useTheme } from '@/theme';

export default function OnboardingBiometricsScreen() {
  const { colors, spacing } = useTheme();
  const support = useBiometricSupport();
  const complete = useCompleteOnboarding();
  const [error, setError] = useState<string | null>(null);
  const label = support.data?.label ?? 'biometría';
  const available = support.data?.available ?? false;

  const enable = async () => {
    setError(null);
    const ok = await requestBiometricAuth(`Activar ${label}`);
    if (ok) complete.mutate({ biometricsEnabled: true });
    else setError(`No pudimos verificar tu ${label}. Puedes intentarlo de nuevo o seguir solo con PIN.`);
  };

  return (
    <FormScreen
      title="Desbloqueo rápido"
      subtitle={available ? `Usa tu ${label} para entrar sin escribir el PIN.` : 'Tu teléfono no tiene huella ni Face ID configurado. Puedes activarlo después en Seguridad.'}
      footer={
        <>
          {available ? <Button label={`Activar ${label}`} icon="unlock" onPress={enable} loading={complete.isPending} /> : null}
          <Button
            label={available ? 'Ahora no' : 'Entrar a la app'}
            variant={available ? 'ghost' : 'primary'}
            onPress={() => complete.mutate({ biometricsEnabled: false })}
            disabled={complete.isPending}
          />
        </>
      }
    >
      <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="shield" size={40} color="primary" />
        </View>
      </View>
      {error ? <Notice tone="warning" message={error} /> : null}
      {complete.isError ? <Notice tone="danger" message="No pudimos guardar tus datos. Intenta de nuevo." /> : null}
      <AppText variant="caption" color="textSecondary" align="center">
        Siempre podrás entrar con tu PIN.
      </AppText>
    </FormScreen>
  );
}
