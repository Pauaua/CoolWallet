import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, PinPad, type IconName } from '@/components';
import { pinService } from '@/services/security';
import { PIN_MAX_LENGTH } from '@/services/security/pinService';
import { useTheme } from '@/theme';

import { formatCountdown } from './formatCountdown';

type PinEntryProps = {
  title: string;
  onSuccess: () => void;
  extraAction?: { icon: IconName; accessibilityLabel: string; onPress: () => void };
};

/** Ingreso de un PIN existente, con intentos restantes y bloqueo temporal. */
export function PinEntry({ title, onSuccess, extraAction }: PinEntryProps) {
  const { spacing } = useTheme();
  const [value, setValue] = useState('');
  const [pinLength, setPinLength] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    void pinService.getPinLength().then(setPinLength);
    void pinService.getLockedUntil().then(setLockedUntil);
  }, []);

  useEffect(() => {
    if (lockedUntil === null) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= lockedUntil) {
        setLockedUntil(null);
        setMessage(null);
      }
    }, 1_000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const verify = async (pin: string) => {
    setChecking(true);
    const result = await pinService.verifyPin(pin);
    setChecking(false);
    setValue('');
    if (result.status === 'ok') {
      onSuccess();
    } else if (result.status === 'locked') {
      setNow(Date.now());
      setLockedUntil(result.lockedUntil);
      setMessage(null);
    } else {
      setMessage(
        result.remainingAttempts === 1
          ? 'PIN incorrecto. Te queda 1 intento antes de un bloqueo temporal.'
          : `PIN incorrecto. Te quedan ${result.remainingAttempts} intentos.`,
      );
    }
  };

  const handleChange = (next: string) => {
    setMessage(null);
    setValue(next);
    if (pinLength !== null && next.length === pinLength) void verify(next);
  };

  const isLocked = lockedUntil !== null && lockedUntil > now;

  return (
    <View style={{ alignItems: 'center', gap: spacing.xl }}>
      <View style={{ gap: spacing.sm, alignItems: 'center' }}>
        <AppText variant="heading" align="center" accessibilityRole="header">
          {title}
        </AppText>
        <AppText color={message || isLocked ? 'danger' : 'textSecondary'} align="center" accessibilityLiveRegion="polite">
          {isLocked
            ? `Demasiados intentos. Espera ${formatCountdown(lockedUntil - now)} para volver a intentar.`
            : (message ?? 'Ingresa tu PIN')}
        </AppText>
      </View>
      <PinPad
        value={value}
        onChange={handleChange}
        maxLength={pinLength ?? PIN_MAX_LENGTH}
        disabled={isLocked || checking}
        extraAction={extraAction}
      />
      {pinLength === null && value.length > 0 ? (
        <View style={{ alignSelf: 'stretch' }}>
          <Button label="Entrar" onPress={() => void verify(value)} loading={checking} />
        </View>
      ) : null}
    </View>
  );
}
