import type { IconName } from '@/components/Icon';

export type ModuleRoute =
  | 'index'
  | 'billetera'
  | 'gastos'
  | 'deudas'
  | 'presupuestos'
  | 'metas'
  | 'calendario'
  | 'reportes';

export type AppModule = {
  /** Nombre de la ruta dentro del grupo `(app)`. */
  route: ModuleRoute;
  title: string;
  icon: IconName;
  /** Qué hace el módulo; se muestra mientras la pantalla no tiene contenido. */
  summary: string;
};

/** Módulos del drawer, en orden. Única fuente para el menú y los títulos del header. */
export const APP_MODULES: readonly AppModule[] = [
  { route: 'index', title: 'Inicio', icon: 'home', summary: 'Tu perfil, sueldo, configuración y un resumen rápido de tus finanzas.' },
  { route: 'billetera', title: 'Billetera', icon: 'credit-card', summary: 'Tu dinero disponible, cuentas, movimientos y proyección a fin de mes.' },
  { route: 'gastos', title: 'Gastos', icon: 'shopping-bag', summary: 'Gastos fijos del mes y registro rápido de gastos variables.' },
  { route: 'deudas', title: 'Deudas', icon: 'file-text', summary: 'Deudas pendientes, en cuotas y variables, con abonos y simulador de pago.' },
  { route: 'presupuestos', title: 'Presupuestos', icon: 'pie-chart', summary: 'Límites mensuales por categoría con alertas al 80% y 100%.' },
  { route: 'metas', title: 'Metas de ahorro', icon: 'target', summary: 'Define metas y descubre cuánto ahorrar cada mes para lograrlas.' },
  { route: 'calendario', title: 'Calendario', icon: 'calendar', summary: 'Vencimientos de gastos fijos y cuotas, con recordatorios.' },
  { route: 'reportes', title: 'Reportes', icon: 'bar-chart-2', summary: 'Evolución de los últimos meses, tasa de ahorro e insights.' },
];

export function getModule(route: ModuleRoute): AppModule {
  const found = APP_MODULES.find((module) => module.route === route);
  if (!found) throw new Error(`Módulo desconocido: ${route}`);
  return found;
}
