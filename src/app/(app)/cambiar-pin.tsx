import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { FormScreen } from '@/components';
import { PinEntry } from '@/features/security/PinEntry';
import { PinSetup } from '@/features/security/PinSetup';
import { pinService } from '@/services/security';

/** Cambiar PIN: primero el actual, luego el nuevo con confirmación. */
export default function ChangePinScreen() {
  const [step, setStep] = useState<'current' | 'new'>('current');
  const [saving, setSaving] = useState(false);

  // Cada vez que se entra a la pantalla se vuelve a pedir el PIN actual.
  useFocusEffect(
    useCallback(() => {
      setStep('current');
    }, []),
  );

  const saveNewPin = async (pin: string) => {
    setSaving(true);
    try {
      await pinService.setPin(pin);
      Alert.alert('PIN actualizado', 'Usa tu nuevo PIN la próxima vez que abras la app.');
      router.back();
    } catch {
      Alert.alert('No pudimos guardar tu PIN', 'Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen>
      {step === 'current' ? (
        <PinEntry title="Ingresa tu PIN actual" onSuccess={() => setStep('new')} />
      ) : (
        <PinSetup onComplete={saveNewPin} busy={saving} />
      )}
    </FormScreen>
  );
}
