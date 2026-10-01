import Feather from '@expo/vector-icons/Feather';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components';
import type { IconName } from '@/components/Icon';
import { CATEGORY_COLOR_LABELS, CATEGORY_ICON_LABELS, CATEGORY_ICONS } from '@/features/expenses/labels';
import { MIN_TOUCH_TARGET, resolveCategoryColor, useTheme } from '@/theme';
import { CATEGORY_COLORS, type CategoryColor } from '@/types/enums';

/** Selector de color de la paleta de categorías (con nombre accesible en español). */
export function ColorPicker({ value, onChange }: { value: CategoryColor; onChange: (value: CategoryColor) => void }) {
  const { colors, scheme, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label" color="textSecondary">
        Color
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }} accessibilityRole="radiogroup" accessibilityLabel="Color">
        {CATEGORY_COLORS.map((key) => {
          const selected = value === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={CATEGORY_COLOR_LABELS[key]}
              onPress={() => onChange(key)}
              style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, borderRadius: MIN_TOUCH_TARGET / 2, borderWidth: selected ? 3 : 0, borderColor: colors.text, padding: 3 }}
            >
              <View style={{ flex: 1, borderRadius: MIN_TOUCH_TARGET, backgroundColor: resolveCategoryColor(key, scheme) }} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Selector de ícono (Feather) con nombres accesibles en español. */
export function IconPicker({ value, onChange, icons = CATEGORY_ICONS }: { value: string; onChange: (value: IconName) => void; icons?: readonly IconName[] }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label" color="textSecondary">
        Ícono
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }} accessibilityRole="radiogroup" accessibilityLabel="Ícono">
        {icons.map((name) => {
          const selected = value === name;
          return (
            <Pressable
              key={name}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={CATEGORY_ICON_LABELS[name] ?? 'Ícono'}
              onPress={() => onChange(name)}
              style={{
                width: MIN_TOUCH_TARGET + 4,
                height: MIN_TOUCH_TARGET + 4,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primarySoft : colors.surface,
              }}
            >
              <Feather name={name} size={20} color={selected ? colors.primary : colors.text} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
