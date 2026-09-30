import { createHash } from 'node:crypto';

import { createMemoryStore } from '../security/keyValueStore';
import { createPinService, getLockoutMs, isValidPin, PIN_MAX_ATTEMPTS } from '../security/pinService';

function setup() {
  let now = 1_000_000;
  let saltCounter = 0;
  const store = createMemoryStore();
  const service = createPinService({
    store,
    sha256: async (value) => createHash('sha256').update(value).digest('hex'),
    randomSalt: () => `salt${(saltCounter += 1)}`,
    now: () => now,
  });
  return { store, service, advance: (ms: number) => (now += ms), getNow: () => now };
}

describe('isValidPin', () => {
  it('acepta de 4 a 6 dígitos', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
    expect(isValidPin('')).toBe(false);
  });
});

describe('getLockoutMs', () => {
  it('bloquea desde el 5.º intento, duplicando hasta 15 min', () => {
    expect(getLockoutMs(0)).toBe(0);
    expect(getLockoutMs(PIN_MAX_ATTEMPTS - 1)).toBe(0);
    expect(getLockoutMs(PIN_MAX_ATTEMPTS)).toBe(30_000);
    expect(getLockoutMs(PIN_MAX_ATTEMPTS + 1)).toBe(60_000);
    expect(getLockoutMs(PIN_MAX_ATTEMPTS + 20)).toBe(15 * 60_000);
  });
});

describe('PinService', () => {
  it('guarda solo el hash con sal (nunca el PIN)', async () => {
    const { store, service } = setup();
    await expect(service.hasPin()).resolves.toBe(false);
    await service.setPin('4821');
    await expect(service.hasPin()).resolves.toBe(true);
    await expect(service.getPinLength()).resolves.toBe(4);
    const stored = store.dump();
    expect(Object.values(stored)).not.toContain('4821');
    expect(stored['pin.hash']).toBe(createHash('sha256').update('salt1:4821').digest('hex'));
  });

  it('rechaza PIN inválidos al crearlos', async () => {
    const { service } = setup();
    await expect(service.setPin('12')).rejects.toThrow('entre 4 y 6');
  });

  it('verifica el PIN correcto e informa intentos restantes', async () => {
    const { service } = setup();
    await service.setPin('4821');
    await expect(service.verifyPin('0000')).resolves.toEqual({ status: 'invalid', remainingAttempts: PIN_MAX_ATTEMPTS - 1 });
    await expect(service.verifyPin('4821')).resolves.toEqual({ status: 'ok' });
    // Un acierto reinicia el contador.
    await expect(service.verifyPin('0000')).resolves.toEqual({ status: 'invalid', remainingAttempts: PIN_MAX_ATTEMPTS - 1 });
  });

  it('bloquea tras varios intentos fallidos y luego permite reintentar', async () => {
    const { service, advance, getNow } = setup();
    await service.setPin('4821');
    for (let attempt = 1; attempt < PIN_MAX_ATTEMPTS; attempt += 1) await service.verifyPin('0000');
    await expect(service.verifyPin('0000')).resolves.toEqual({ status: 'locked', lockedUntil: getNow() + 30_000 });

    // Incluso el PIN correcto se rechaza mientras dura el bloqueo.
    await expect(service.verifyPin('4821')).resolves.toMatchObject({ status: 'locked' });
    await expect(service.getLockedUntil()).resolves.toBe(getNow() + 30_000);

    advance(30_001);
    await expect(service.getLockedUntil()).resolves.toBeNull();
    await expect(service.verifyPin('4821')).resolves.toEqual({ status: 'ok' });
  });

  it('sin PIN guardado nunca valida', async () => {
    const { service } = setup();
    await expect(service.verifyPin('1234')).resolves.toMatchObject({ status: 'invalid' });
  });

  it('cambiar el PIN usa una sal nueva e invalida el anterior', async () => {
    const { service } = setup();
    await service.setPin('1111');
    await service.setPin('2222');
    await expect(service.verifyPin('1111')).resolves.toMatchObject({ status: 'invalid' });
    await expect(service.verifyPin('2222')).resolves.toEqual({ status: 'ok' });
  });

  it('clear borra todo', async () => {
    const { store, service } = setup();
    await service.setPin('4821');
    await service.verifyPin('0000');
    await service.clear();
    expect(store.dump()).toEqual({});
    await expect(service.hasPin()).resolves.toBe(false);
    await expect(service.getPinLength()).resolves.toBeNull();
  });

  it('ignora contadores corruptos', async () => {
    const { store, service } = setup();
    await service.setPin('4821');
    await store.setItem('pin.failedAttempts', 'abc');
    await expect(service.verifyPin('0000')).resolves.toEqual({ status: 'invalid', remainingAttempts: PIN_MAX_ATTEMPTS - 1 });
  });
});
