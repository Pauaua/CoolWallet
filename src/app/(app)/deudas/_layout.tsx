import { Stack } from 'expo-router';

/** Stack interno del módulo; el header lo pone el Drawer. */
export default function ModuleLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
