import { Alert } from 'react-native';

/** Doble confirmación antes de borrar todos los datos. */
export function confirmWipe(onConfirmed: () => void) {
  Alert.alert(
    '¿Borrar todos los datos?',
    'Se eliminarán tu perfil, movimientos, deudas, metas y el PIN de este teléfono. Esta acción no se puede deshacer.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Continuar',
        style: 'destructive',
        onPress: () =>
          Alert.alert('¿Estás completamente seguro?', 'Si no tienes un respaldo, perderás toda tu información.', [
            { text: 'No, volver', style: 'cancel' },
            { text: 'Sí, borrar todo', style: 'destructive', onPress: onConfirmed },
          ]),
      },
    ],
  );
}
