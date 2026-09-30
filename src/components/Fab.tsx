import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type FabProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
};

/** Botón flotante principal (abajo a la derecha) con ícono y texto. */
export function Fab({ icon, label, onPress }: FabProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', right: spacing.lg, bottom: spacing.lg + insets.bottom }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: 56,
          paddingHorizontal: spacing.xl,
          borderRadius: radius.pill,
          backgroundColor: pressed ? colors.primaryDark : colors.primary,
          shadowColor: colors.shadow,
          shadowOpacity: 0.18,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        })}
      >
        <Icon name={icon} color="onPrimary" />
        <AppText variant="bodyStrong" color="onPrimary">
          {label}
        </AppText>
      </Pressable>
    </View>
  );
}
