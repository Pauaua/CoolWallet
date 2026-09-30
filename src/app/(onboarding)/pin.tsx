import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { FormScreen } from '@/components';
import { PinSetup } from '@/features/security/PinSetup';
import { pinService } from '@/services/security';

export default function OnboardingPinScreen() {
  const [saving, setSaving] = useState(false);

  const handleComplete = async (pin: string) => {
    setSaving(true);
    try {
      await pinService.setPin(pin);
      router.push('/biometria');
    } catch {
      Alert.alert('No pudimos guardar tu PIN', 'Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen title="Protege tu app" subtitle="Te pediremos este PIN cada vez que abras la app.">
      <PinSetup onComplete={handleComplete} busy={saving} />
    </FormScreen>
  );
}
