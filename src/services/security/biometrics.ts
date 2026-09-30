import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricSupport = {
  /** Hay sensor y la persona tiene huella/rostro registrado. */
  available: boolean;
  /** Nombre para mostrar: "Face ID", "huella" o "biometría". */
  label: string;
};

export async function getBiometricSupport(): Promise<BiometricSupport> {
  const [hasHardware, isEnrolled, types] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);
  const label = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    ? 'Face ID'
    : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ? 'huella'
      : 'biometría';
  return { available: hasHardware && isEnrolled, label };
}

/** Pide huella/Face ID. Devuelve `true` solo si la autenticación fue exitosa. */
export async function authenticateWithBiometrics(promptMessage = 'Desbloquear Control de Gastos'): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Usar PIN',
    disableDeviceFallback: true,
  });
  return result.success;
}
