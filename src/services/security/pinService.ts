import type { KeyValueStore } from './keyValueStore';

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;
/** Intentos fallidos permitidos antes del primer bloqueo temporal. */
export const PIN_MAX_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 30_000;
const MAX_LOCKOUT_MS = 15 * 60_000;

const KEYS = {
  hash: 'pin.hash',
  salt: 'pin.salt',
  length: 'pin.length',
  failedAttempts: 'pin.failedAttempts',
  lockedUntil: 'pin.lockedUntil',
} as const;

/** El PIN tiene entre 4 y 6 dígitos. */
export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(pin);
}

/**
 * Tiempo de bloqueo tras `failedAttempts` intentos fallidos: nada antes del
 * 5.º; luego 30 s, 60 s, 120 s… con tope de 15 minutos.
 */
export function getLockoutMs(failedAttempts: number): number {
  if (failedAttempts < PIN_MAX_ATTEMPTS) return 0;
  return Math.min(BASE_LOCKOUT_MS * 2 ** (failedAttempts - PIN_MAX_ATTEMPTS), MAX_LOCKOUT_MS);
}

export type PinVerification =
  | { status: 'ok' }
  | { status: 'invalid'; remainingAttempts: number }
  | { status: 'locked'; lockedUntil: number };

export type PinServiceDeps = {
  store: KeyValueStore;
  /** SHA-256 en hex. */
  sha256: (value: string) => Promise<string>;
  /** Sal aleatoria en hex. */
  randomSalt: () => string;
  /** Hora actual en ms. */
  now: () => number;
};

export interface PinService {
  hasPin(): Promise<boolean>;
  /** Largo del PIN guardado (para validar apenas se ingresa el último dígito), o `null`. */
  getPinLength(): Promise<number | null>;
  setPin(pin: string): Promise<void>;
  verifyPin(pin: string): Promise<PinVerification>;
  /** Si hay un bloqueo temporal vigente, hasta cuándo (ms). */
  getLockedUntil(): Promise<number | null>;
  /** Borra el PIN y los contadores (restablecer la app). */
  clear(): Promise<void>;
}

/**
 * PIN local: se guarda solo el hash SHA-256 con sal en el almacenamiento seguro
 * del sistema. Tras varios intentos fallidos se bloquea por un tiempo creciente.
 */
export function createPinService({ store, sha256, randomSalt, now }: PinServiceDeps): PinService {
  const hashPin = (pin: string, salt: string) => sha256(`${salt}:${pin}`);

  const readNumber = async (key: string) => {
    const value = await store.getItem(key);
    const parsed = value === null ? NaN : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const resetAttempts = async () => {
    await store.deleteItem(KEYS.failedAttempts);
    await store.deleteItem(KEYS.lockedUntil);
  };

  const getLockedUntil = async () => {
    const lockedUntil = await readNumber(KEYS.lockedUntil);
    return lockedUntil > now() ? lockedUntil : null;
  };

  return {
    async hasPin() {
      return (await store.getItem(KEYS.hash)) !== null;
    },

    async getPinLength() {
      const length = await readNumber(KEYS.length);
      return length >= PIN_MIN_LENGTH && length <= PIN_MAX_LENGTH ? length : null;
    },

    async setPin(pin) {
      if (!isValidPin(pin)) throw new Error('El PIN debe tener entre 4 y 6 dígitos.');
      const salt = randomSalt();
      await store.setItem(KEYS.salt, salt);
      await store.setItem(KEYS.length, String(pin.length));
      await store.setItem(KEYS.hash, await hashPin(pin, salt));
      await resetAttempts();
    },

    async verifyPin(pin) {
      const lockedUntil = await getLockedUntil();
      if (lockedUntil !== null) return { status: 'locked', lockedUntil };

      const [storedHash, salt] = await Promise.all([store.getItem(KEYS.hash), store.getItem(KEYS.salt)]);
      if (storedHash !== null && salt !== null && isValidPin(pin) && (await hashPin(pin, salt)) === storedHash) {
        await resetAttempts();
        return { status: 'ok' };
      }

      const failedAttempts = (await readNumber(KEYS.failedAttempts)) + 1;
      await store.setItem(KEYS.failedAttempts, String(failedAttempts));
      const lockoutMs = getLockoutMs(failedAttempts);
      if (lockoutMs > 0) {
        const until = now() + lockoutMs;
        await store.setItem(KEYS.lockedUntil, String(until));
        return { status: 'locked', lockedUntil: until };
      }
      return { status: 'invalid', remainingAttempts: PIN_MAX_ATTEMPTS - failedAttempts };
    },

    getLockedUntil,

    async clear() {
      await Promise.all(Object.values(KEYS).map((key) => store.deleteItem(key)));
    },
  };
}
