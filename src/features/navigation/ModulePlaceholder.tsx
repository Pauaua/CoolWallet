import { EmptyState, Screen } from '@/components';

import { getModule, type ModuleRoute } from './modules';

/** Pantalla de un módulo cuyo contenido aún no se construye. No muestra datos falsos. */
export function ModulePlaceholder({ route }: { route: ModuleRoute }) {
  const module = getModule(route);
  return (
    <Screen>
      <EmptyState icon={module.icon} title={`${module.title}: disponible pronto`} description={module.summary} />
    </Screen>
  );
}
