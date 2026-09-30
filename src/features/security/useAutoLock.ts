import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useSessionStore } from '@/store/sessionStore';

import { shouldLockOnResume } from './autoLock';

/** Bloquea la app al volver de segundo plano después de `timeoutMinutes`. */
export function useAutoLock(timeoutMinutes: number, enabled: boolean) {
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener('change', (status) => {
      const session = useSessionStore.getState();
      if (session.autoLockSuppressions > 0) {
        backgroundedAt.current = null;
        return;
      }
      if (status === 'background') {
        backgroundedAt.current = Date.now();
      } else if (status === 'active') {
        if (shouldLockOnResume(backgroundedAt.current, Date.now(), timeoutMinutes)) session.lock();
        backgroundedAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [timeoutMinutes, enabled]);
}
