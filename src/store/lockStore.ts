import { create } from 'zustand';

type LockState = {
  isLocked: boolean;
  lock: () => void;
  unlock: () => void;
};

/** Estado de bloqueo de la app. El layout raíz redirige a `/lock` cuando `isLocked` es true. */
export const useLockStore = create<LockState>((set) => ({
  isLocked: false,
  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),
}));
