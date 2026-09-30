import { Drawer, type DrawerContentComponentProps } from 'expo-router/drawer';

import { IconButton } from '@/components';
import { DrawerPanel } from '@/features/navigation/DrawerPanel';
import { APP_MODULES } from '@/features/navigation/modules';
import { useLockStore } from '@/store/lockStore';
import { useTheme } from '@/theme';

export default function AppLayout() {
  const { colors, typography, spacing } = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        drawerPosition: 'left',
        drawerType: 'front',
        drawerStyle: { backgroundColor: colors.surface },
        overlayColor: colors.overlay,
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: typography.heading,
        headerTitleAlign: 'left',
        headerLeftContainerStyle: { paddingLeft: spacing.xs },
        headerLeft: () => (
          <IconButton icon="menu" accessibilityLabel="Abrir menú" onPress={() => navigation.toggleDrawer()} />
        ),
        sceneStyle: { backgroundColor: colors.background },
      })}
    >
      {APP_MODULES.map((module) => (
        <Drawer.Screen key={module.route} name={module.route} options={{ title: module.title }} />
      ))}
    </Drawer>
  );
}

function AppDrawerContent({ state, navigation }: DrawerContentComponentProps) {
  const lock = useLockStore((s) => s.lock);
  const activeRoute = state.routes[state.index]?.name ?? 'index';

  return (
    <DrawerPanel
      userName=""
      activeRoute={activeRoute}
      onNavigate={(route) => navigation.navigate(route)}
      onLock={() => {
        navigation.closeDrawer();
        lock();
      }}
    />
  );
}
