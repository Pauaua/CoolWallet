import { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { fontFamily, MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { AppText } from './AppText';

export type TextFieldProps = TextInputProps & {
  label: string;
  /** Texto de ayuda bajo el campo (se oculta si hay error). */
  hint?: string;
  error?: string;
  /** Texto fijo antes del valor, ej.: "$". */
  prefix?: string;
  /** Texto fijo después del valor, ej.: "%" o "UF". */
  suffix?: string;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, prefix, suffix, style, onFocus, onBlur, ...inputProps },
  ref,
) {
  const { colors, radius, spacing, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: MIN_TOUCH_TARGET + 4,
          paddingHorizontal: spacing.md,
          borderWidth: focused ? 1.5 : 1,
          borderColor,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          gap: spacing.xs,
        }}
      >
        {prefix ? <AppText color="textSecondary">{prefix}</AppText> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.accent}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[typography.body, { flex: 1, color: colors.text, fontFamily: fontFamily.regular, paddingVertical: spacing.sm }, style]}
          {...inputProps}
        />
        {suffix ? <AppText color="textSecondary">{suffix}</AppText> : null}
      </View>
      {error ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="textSecondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});
