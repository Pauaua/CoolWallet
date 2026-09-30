import { useQuery } from '@tanstack/react-query';

import { authenticateWithBiometrics, getBiometricSupport } from '@/services/security';
import { withoutAutoLock } from '@/store/sessionStore';

/** Si el dispositivo tiene huella/Face ID disponible (se consulta una vez). */
export function useBiometricSupport() {
  return useQuery({ queryKey: ['biometricSupport'], queryFn: getBiometricSupport, staleTime: 60_000 });
}

/** Pide autenticación biométrica sin que el diálogo del sistema dispare el bloqueo automático. */
export function requestBiometricAuth(promptMessage?: string): Promise<boolean> {
  return withoutAutoLock(() => authenticateWithBiometrics(promptMessage)).catch(() => false);
}
