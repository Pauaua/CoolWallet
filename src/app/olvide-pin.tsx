import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, Button, FormScreen, Icon, Notice } from '@/components';
import { confirmWipe } from '@/features/security/confirmWipe';
import { useResetApp } from '@/features/security/useResetApp';
import { useTheme } from '@/theme';

/** Olvidé mi PIN: el PIN no se puede recuperar; solo se puede empezar de cero. */
export default function ForgotPinScreen() {
  const { colors, spacing } = useTheme();
  const reset = useResetApp();

  return (
    <FormScreen
      withTopInset
      title="¿Olvidaste tu PIN?"
      subtitle="Por seguridad, tu PIN no se guarda en ninguna parte y no se puede recuperar."
      footer={
        <>
          <Button
            label="Borrar todos los datos"
            icon="trash-2"
            variant="danger"
            loading={reset.isPending}
            onPress={() => confirmWipe(() => reset.mutate())}
          />
          <Button label="Volver" variant="ghost" onPress={() => router.back()} disabled={reset.isPending} />
        </>
      }
    >
      <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="key" size={36} color="primary" />
        </View>
      </View>
      <AppText>Para volver a usar la app tienes que borrar los datos de este teléfono y configurarla otra vez.</AppText>
      <Notice
        tone="danger"
        message="Se eliminarán tu perfil, movimientos, deudas, metas y configuración. No se puede deshacer."
      />
      {reset.isError ? <Notice tone="danger" message="No pudimos borrar los datos. Intenta de nuevo." /> : null}
    </FormScreen>
  );
}
