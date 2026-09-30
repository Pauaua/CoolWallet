import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Icon } from '@/components';
import { useLockStore } from '@/store/lockStore';
import { useTheme } from '@/theme';

/**
 * Pantalla de bloqueo. En la fase 1 solo tiene el botón "Desbloquear";
 * en la fase 3 se reemplaza por el ingreso de PIN y la biometría.
 */
export default function LockScreen() {
  const { colors, spacing } = useTheme();
  const unlock = useLockStore((state) => state.unlock);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
        <View
          style={{
            alignSelf: 'center',
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="lock" size={36} color="primary" />
        </View>
        <AppText variant="title" align="center" accessibilityRole="header">
          App bloqueada
        </AppText>
        <AppText color="textSecondary" align="center">
          Tus datos están protegidos en este dispositivo.
        </AppText>
        <View style={{ marginTop: spacing.lg }}>
          <Button label="Desbloquear" icon="unlock" onPress={unlock} />
        </View>
      </View>
    </SafeAreaView>
  );
}
