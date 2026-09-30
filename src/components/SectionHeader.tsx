import { Pressable, View } from 'react-native';

import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { AppText } from './AppText';

type SectionHeaderProps = {
  title: string;
  action?: { label: string; onPress: () => void };
};

/** Título de sección con acción opcional a la derecha ("Ver todo"). */
export function SectionHeader({ title, action }: SectionHeaderProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm }}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          hitSlop={8}
          style={({ pressed }) => ({ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
        >
          <AppText variant="label" color="primary">
            {action.label}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
