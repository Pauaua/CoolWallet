import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, Button, FormScreen, Icon, type IconName } from '@/components';
import { useTheme } from '@/theme';

const HIGHLIGHTS: { icon: IconName; text: string }[] = [
  { icon: 'eye', text: 'Mira con claridad lo que entra, lo que sale, lo que debes y lo que te queda.' },
  { icon: 'wifi-off', text: 'Funciona sin internet: tus datos viven solo en este teléfono.' },
  { icon: 'lock', text: 'Protegida con PIN y, si quieres, con tu huella o Face ID.' },
];

export default function WelcomeScreen() {
  const { colors, spacing } = useTheme();
  return (
    <FormScreen withTopInset footer={<Button label="Comenzar" onPress={() => router.push('/nombre')} />}>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.xxl }}>
        <View style={{ gap: spacing.lg }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="trending-up" size={34} color="onPrimary" />
          </View>
          <AppText variant="display" accessibilityRole="header">
            Toma el control de tu dinero
          </AppText>
          <AppText color="textSecondary">Configuremos tu app en menos de dos minutos.</AppText>
        </View>
        <View style={{ gap: spacing.lg }}>
          {HIGHLIGHTS.map((item) => (
            <View key={item.icon} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
              <Icon name={item.icon} color="primary" />
              <AppText style={{ flex: 1 }}>{item.text}</AppText>
            </View>
          ))}
        </View>
      </View>
    </FormScreen>
  );
}
