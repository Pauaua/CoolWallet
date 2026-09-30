import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DrawerPanel } from '../DrawerPanel';
import { APP_MODULES } from '../modules';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function renderPanel(overrides: Partial<Parameters<typeof DrawerPanel>[0]> = {}) {
  const props = {
    userName: 'Camila Rojas',
    activeRoute: 'index',
    onNavigate: jest.fn(),
    onProfilePress: jest.fn(),
    onLock: jest.fn(),
    ...overrides,
  };
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <DrawerPanel {...props} />
    </SafeAreaProvider>,
  );
  return props;
}

describe('DrawerPanel', () => {
  it('muestra el nombre del usuario y todos los módulos', async () => {
    await renderPanel();
    expect(screen.getByText('Camila Rojas')).toBeOnTheScreen();
    for (const module of APP_MODULES) {
      expect(screen.getByRole('button', { name: module.title })).toBeOnTheScreen();
    }
  });

  it('usa un texto por defecto si aún no hay nombre', async () => {
    await renderPanel({ userName: '' });
    expect(screen.getByText('Tu perfil')).toBeOnTheScreen();
  });

  it('marca como seleccionado solo el módulo activo', async () => {
    await renderPanel({ activeRoute: 'billetera' });
    expect(screen.getByRole('button', { name: 'Billetera' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Inicio' })).not.toBeSelected();
  });

  it('navega al tocar un módulo', async () => {
    const { onNavigate } = await renderPanel();
    await fireEvent.press(screen.getByRole('button', { name: 'Deudas' }));
    expect(onNavigate).toHaveBeenCalledWith('deudas');
  });

  it('abre el perfil al tocar el encabezado', async () => {
    const { onProfilePress } = await renderPanel();
    await fireEvent.press(screen.getByRole('button', { name: 'Camila Rojas. Ver y editar perfil' }));
    expect(onProfilePress).toHaveBeenCalledTimes(1);
  });

  it('bloquea la app al tocar "Bloquear app"', async () => {
    const { onLock } = await renderPanel();
    await fireEvent.press(screen.getByRole('button', { name: 'Bloquear app' }));
    expect(onLock).toHaveBeenCalledTimes(1);
  });
});
