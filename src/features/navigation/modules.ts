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
};

/** Módulos del drawer, en orden. Única fuente para el menú y los títulos del header. */
export const APP_MODULES: readonly AppModule[] = [
  { route: 'index', title: 'Inicio', icon: 'home' },
  { route: 'billetera', title: 'Billetera', icon: 'credit-card' },
  { route: 'gastos', title: 'Gastos', icon: 'shopping-bag' },
  { route: 'deudas', title: 'Deudas', icon: 'file-text' },
  { route: 'presupuestos', title: 'Presupuestos', icon: 'pie-chart' },
  { route: 'metas', title: 'Metas de ahorro', icon: 'target' },
  { route: 'calendario', title: 'Calendario', icon: 'calendar' },
  { route: 'reportes', title: 'Reportes', icon: 'bar-chart-2' },
];

