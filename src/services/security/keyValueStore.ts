/** Almacenamiento clave-valor seguro (Keychain / Keystore en la app, memoria en tests). */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

/** Implementación en memoria para tests. */
export function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore & { dump: () => Record<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    async getItem(key) {
      return data.get(key) ?? null;
    },
    async setItem(key, value) {
      data.set(key, value);
    },
    async deleteItem(key) {
      data.delete(key);
    },
    dump: () => Object.fromEntries(data),
  };
}
