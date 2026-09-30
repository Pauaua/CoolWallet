import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import type { KeyValueStore } from './keyValueStore';
import { createPinService } from './pinService';

const secureStore: KeyValueStore = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  deleteItem: (key) => SecureStore.deleteItemAsync(key),
};

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Servicio de PIN de la app (hash en expo-secure-store). */
export const pinService = createPinService({
  store: secureStore,
  sha256: (value) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value),
  randomSalt: () => toHex(Crypto.getRandomBytes(16)),
  now: () => Date.now(),
});

export { authenticateWithBiometrics, getBiometricSupport, type BiometricSupport } from './biometrics';
export { isValidPin, PIN_MAX_LENGTH, PIN_MIN_LENGTH, type PinService, type PinVerification } from './pinService';
