import { create } from 'zustand';

type SessionState = {
  /** Terminó el onboarding (hay perfil y PIN). */
  isOnboarded: boolean;
  /** La app está bloqueada y muestra `/lock`. Arranca bloqueada. */
  isLocked: boolean;
  /**
   * Operaciones en curso que sacan la app a segundo plano a propósito
   * (galería de fotos, hoja de compartir…). Mientras sea > 0 no se bloquea.
   */
  autoLockSuppressions: number;
  setOnboarded: (isOnboarded: boolean) => void;
  completeOnboarding: () => void;
  lock: () => void;
  unlock: () => void;
  /** Vuelve al estado inicial (tras borrar todos los datos). */
  reset: () => void;
  /** Suspende el bloqueo automático; devuelve la función para reanudarlo. */
  suppressAutoLock: () => () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  isOnboarded: false,
  isLocked: true,
  autoLockSuppressions: 0,
  setOnboarded: (isOnboarded) => set({ isOnboarded }),
  completeOnboarding: () => set({ isOnboarded: true, isLocked: false }),
  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),
  reset: () => set({ isOnboarded: false, isLocked: false, autoLockSuppressions: 0 }),
  suppressAutoLock: () => {
    set((state) => ({ autoLockSuppressions: state.autoLockSuppressions + 1 }));
    let released = false;
    return () => {
      if (released) return;
      released = true;
      set((state) => ({ autoLockSuppressions: Math.max(0, state.autoLockSuppressions - 1) }));
    };
  },
}));

/** Ejecuta una acción que abre UI del sistema sin disparar el bloqueo automático. */
export async function withoutAutoLock<T>(action: () => Promise<T>): Promise<T> {
  const release = useSessionStore.getState().suppressAutoLock();
  try {
    return await action();
  } finally {
    // Al volver, AppState pasa a "active" justo después de resolverse la acción.
    setTimeout(release, 1_000);
  }
}
