import { Pressable, View } from 'react-native';

import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { AppText } from './AppText';

export type SegmentOption<T extends string | number> = { value: T; label: string };

type SegmentedControlProps<T extends string | number> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Nombre del grupo para lectores de pantalla. */
  accessibilityLabel: string;
};

export function SegmentedControl<T extends string | number>({ options, value, onChange, accessibilityLabel }: SegmentedControlProps<T>) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.xs, gap: spacing.xs }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              minHeight: MIN_TOUCH_TARGET - 4,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.sm,
              paddingHorizontal: spacing.sm,
              backgroundColor: selected ? colors.surface : 'transparent',
              borderWidth: selected ? 1 : 0,
              borderColor: colors.border,
            }}
          >
            <AppText variant={selected ? 'bodyStrong' : 'label'} color={selected ? 'primary' : 'textSecondary'} numberOfLines={1}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
