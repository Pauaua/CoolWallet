import { Pressable, View } from 'react-native';

import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { AppText } from './AppText';

type ChipGroupProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

/** Opciones como chips que se ajustan en varias líneas. */
export function ChipGroup<T extends string>({ options, value, onChange, accessibilityLabel }: ChipGroupProps<T>) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              minHeight: MIN_TOUCH_TARGET,
              justifyContent: 'center',
              paddingHorizontal: spacing.lg,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primarySoft : colors.surface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <AppText variant="label" color={selected ? 'primary' : 'text'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
