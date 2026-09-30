import { router } from 'expo-router';
import { Drawer, type DrawerContentComponentProps } from 'expo-router/drawer';

import { IconButton } from '@/components';
import { DrawerPanel } from '@/features/navigation/DrawerPanel';
import { APP_MODULES } from '@/features/navigation/modules';
import { useProfile } from '@/features/profile/queries';
import { useSessionStore } from '@/store/sessionStore';
import { useTheme } from '@/theme';

/** Pantallas secundarias (fuera del menú) que muestran "Volver" en vez de la hamburguesa. */
const SECONDARY_SCREENS = [
  { name: 'perfil', title: 'Perfil' },
  { name: 'sueldo', title: 'Sueldo líquido' },
  { name: 'configuracion', title: 'Configuración' },
  { name: 'historial', title: 'Historial' },
  { name: 'categorias', title: 'Categorías' },
  { name: 'simulador', title: 'Simulador de pago' },
  { name: 'seguridad', title: 'Seguridad' },
  { name: 'cambiar-pin', title: 'Cambiar PIN' },
] as const;

function goBack() {
  if (router.canGoBack()) router.back();
  else router.navigate('/');
}

export default function AppLayout() {
  const { colors, typography, spacing } = useTheme();

  return (
    <Drawer
      backBehavior="history"
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
        headerLeft: () => <IconButton icon="menu" accessibilityLabel="Abrir menú" onPress={() => navigation.toggleDrawer()} />,
        sceneStyle: { backgroundColor: colors.background },
      })}
    >
      {APP_MODULES.map((module) => (
        <Drawer.Screen
          key={module.route}
          name={module.route}
          options={{
            title: module.title,
            headerRight:
              module.route === 'gastos'
                ? () => <IconButton icon="tag" accessibilityLabel="Categorías" onPress={() => router.push('/categorias')} />
                : undefined,
            headerRightContainerStyle: { paddingRight: spacing.xs },
          }}
        />
      ))}
      {SECONDARY_SCREENS.map((screen) => (
        <Drawer.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
            swipeEnabled: false,
            headerLeft: () => <IconButton icon="arrow-left" accessibilityLabel="Volver" onPress={goBack} />,
          }}
        />
      ))}
    </Drawer>
  );
}

function AppDrawerContent({ state, navigation }: DrawerContentComponentProps) {
  const lock = useSessionStore((s) => s.lock);
  const profile = useProfile();
  const activeRoute = state.routes[state.index]?.name ?? 'index';

  return (
    <DrawerPanel
      userName={profile.data?.name ?? ''}
      photoUri={profile.data?.photoUri}
      activeRoute={activeRoute}
      onNavigate={(route) => navigation.navigate(route)}
      onProfilePress={() => {
        navigation.closeDrawer();
        router.push('/perfil');
      }}
      onLock={() => {
        navigation.closeDrawer();
        lock();
      }}
    />
  );
}
