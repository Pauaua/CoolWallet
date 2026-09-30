import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

const KEY_SIZE = 72;
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

type PinPadProps = {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  /** Cantidad de puntos a mostrar (si el largo es fijo). Por defecto `maxLength`. */
  dots?: number;
  disabled?: boolean;
  /** Botón opcional abajo a la izquierda (ej.: huella). */
  extraAction?: { icon: IconName; accessibilityLabel: string; onPress: () => void };
};

/** Teclado numérico para ingresar el PIN, con indicador de dígitos. */
export function PinPad({ value, onChange, maxLength, dots, disabled = false, extraAction }: PinPadProps) {
  const { colors, spacing } = useTheme();
  const dotCount = Math.max(dots ?? maxLength, value.length);

  const press = (digit: string) => {
    if (!disabled && value.length < maxLength) onChange(value + digit);
  };

  return (
    <View style={{ alignItems: 'center', gap: spacing.xl }}>
      <View
        accessible
        accessibilityLabel={`${value.length} de ${dots ?? maxLength} dígitos ingresados`}
        style={{ flexDirection: 'row', gap: spacing.md, minHeight: 16 }}
      >
        {Array.from({ length: dotCount }, (_, index) => (
          <View
            key={index}
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              borderWidth: 1.5,
              borderColor: colors.primary,
              backgroundColor: index < value.length ? colors.primary : 'transparent',
            }}
          />
        ))}
      </View>

      <View style={{ width: KEY_SIZE * 3 + spacing.xl * 2, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl, rowGap: spacing.md }}>
        {DIGITS.map((digit) => (
          <Key key={digit} label={digit} onPress={() => press(digit)} disabled={disabled} />
        ))}
        {extraAction ? (
          <Key icon={extraAction.icon} accessibilityLabel={extraAction.accessibilityLabel} onPress={extraAction.onPress} disabled={disabled} subtle />
        ) : (
          <View style={styles.key} />
        )}
        <Key label="0" onPress={() => press('0')} disabled={disabled} />
        <Key icon="delete" accessibilityLabel="Borrar dígito" onPress={() => onChange(value.slice(0, -1))} disabled={disabled || value.length === 0} subtle />
      </View>
    </View>
  );
}

type KeyProps = {
  label?: string;
  icon?: IconName;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled: boolean;
  subtle?: boolean;
};

function Key({ label, icon, accessibilityLabel, onPress, disabled, subtle = false }: KeyProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        {
          backgroundColor: subtle ? 'transparent' : pressed ? colors.primarySoft : colors.surface,
          borderColor: subtle ? 'transparent' : colors.border,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={26} color="text" /> : <AppText variant="title">{label}</AppText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
