import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Avatar, Divider, Icon } from '@/components';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { APP_MODULES, type AppModule } from './modules';

type DrawerPanelProps = {
  userName: string;
  photoUri?: string | null;
  activeRoute: string;
  onNavigate: (route: AppModule['route']) => void;
  onProfilePress: () => void;
  onLock: () => void;
};

/** Contenido de la barra lateral: perfil arriba, módulos al centro y "Bloquear app" fijo abajo. */
export function DrawerPanel({ userName, photoUri, activeRoute, onNavigate, onProfilePress, onLock }: DrawerPanelProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const displayName = userName.trim() || 'Tu perfil';

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${displayName}. Ver y editar perfil`}
        onPress={onProfilePress}
        style={({ pressed }) => [styles.profile, { padding: spacing.xl, gap: spacing.md, opacity: pressed ? 0.7 : 1 }]}
      >
        <Avatar name={userName} photoUri={photoUri} />
        <View style={{ flex: 1 }}>
          <AppText variant="heading" numberOfLines={1}>
            {displayName}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            Ver perfil
          </AppText>
        </View>
        <Icon name="chevron-right" color="textSecondary" size={18} />
      </Pressable>
      <Divider />

      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.xs }}>
        {APP_MODULES.map((module) => (
          <DrawerRow
            key={module.route}
            module={module}
            active={module.route === activeRoute}
            onPress={() => onNavigate(module.route)}
          />
        ))}
      </ScrollView>

      <Divider />
      <View style={{ padding: spacing.md, paddingBottom: spacing.md + insets.bottom }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bloquear app"
          onPress={onLock}
          style={({ pressed }) => [styles.row, { paddingHorizontal: spacing.md, gap: spacing.md, opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon name="lock" color="textSecondary" />
          <AppText variant="label" color="textSecondary">
            Bloquear app
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

type DrawerRowProps = {
  module: AppModule;
  active: boolean;
  onPress: () => void;
};

function DrawerRow({ module, active, onPress }: DrawerRowProps) {
  const { colors, radius, spacing } = useTheme();
  const tint = active ? 'primary' : 'text';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={module.title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          paddingHorizontal: spacing.md,
          gap: spacing.md,
          borderRadius: radius.md,
          backgroundColor: active ? colors.primarySoft : pressed ? colors.background : 'transparent',
        },
      ]}
    >
      <Icon name={module.icon} color={tint} />
      <AppText variant={active ? 'bodyStrong' : 'body'} color={tint}>
        {module.title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET + 4,
  },
});
