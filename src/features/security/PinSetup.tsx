import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, PinPad } from '@/components';
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH } from '@/services/security/pinService';
import { useTheme } from '@/theme';

type PinSetupProps = {
  /** Se llama con el PIN confirmado. */
  onComplete: (pin: string) => void | Promise<void>;
  busy?: boolean;
};

/** Crear un PIN nuevo: se ingresa (4 a 6 dígitos) y luego se confirma. */
export function PinSetup({ onComplete, busy = false }: PinSetupProps) {
  const { spacing } = useTheme();
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirmChange = (next: string) => {
    setValue(next);
    if (next.length < firstPin.length) return;
    if (next === firstPin) {
      void onComplete(next);
    } else {
      setError('Los PIN no coinciden. Vuelve a crearlo.');
      setStep('create');
      setFirstPin('');
      setValue('');
    }
  };

  return (
    <View style={{ alignItems: 'center', gap: spacing.xl }}>
      <View style={{ gap: spacing.sm, alignItems: 'center' }}>
        <AppText variant="heading" align="center" accessibilityRole="header">
          {step === 'create' ? 'Crea tu PIN' : 'Confirma tu PIN'}
        </AppText>
        <AppText color={error ? 'danger' : 'textSecondary'} align="center" accessibilityLiveRegion="polite">
          {error ?? (step === 'create' ? `Usa entre ${PIN_MIN_LENGTH} y ${PIN_MAX_LENGTH} dígitos.` : 'Ingrésalo otra vez.')}
        </AppText>
      </View>

      {step === 'create' ? (
        <PinPad
          value={value}
          onChange={(next) => {
            setError(null);
            setValue(next);
          }}
          maxLength={PIN_MAX_LENGTH}
          dots={Math.max(PIN_MIN_LENGTH, value.length)}
        />
      ) : (
        <PinPad value={value} onChange={handleConfirmChange} maxLength={firstPin.length} disabled={busy} />
      )}

      {step === 'create' ? (
        <View style={{ alignSelf: 'stretch' }}>
          <Button
            label="Continuar"
            disabled={value.length < PIN_MIN_LENGTH}
            onPress={() => {
              setFirstPin(value);
              setValue('');
              setStep('confirm');
            }}
          />
        </View>
      ) : busy ? (
        <AppText color="textSecondary">Guardando…</AppText>
      ) : null}
    </View>
  );
}
