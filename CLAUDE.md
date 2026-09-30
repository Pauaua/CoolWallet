@AGENTS.md

# Control de Gastos — guía del proyecto

App móvil **local-first** de control de gastos personales. UI en **español (Chile)**, montos en **CLP**.
Sin backend, sin cuentas, sin llamadas de red: todo vive en el dispositivo. Se prueba con **Expo Go**.

## Stack

- Expo SDK 57 · React Native 0.86 · React 19 · TypeScript 6 (`strict`, `noUncheckedIndexedAccess`)
- Expo Router (rutas en `src/app/`) · Drawer incluido en `expo-router/drawer` (no se instala `@react-navigation/drawer` desde SDK 56)
- date-fns · Zustand (estado de UI) · Inter vía `@expo-google-fonts/inter` · íconos Feather (`@expo/vector-icons`)
- Jest (`jest-expo`) + `@testing-library/react-native` v14
- Próximas fases: `expo-sqlite` + Drizzle, TanStack Query, react-hook-form + zod, react-native-gifted-charts, expo-secure-store, expo-local-authentication, expo-notifications, expo-file-system/sharing/document-picker.

## Comandos

```bash
npx expo start          # servidor de desarrollo (escanear QR con Expo Go)
npm run typecheck       # tsc --noEmit
npm run lint            # expo lint (ESLint flat config)
npm test                # jest
npm run test:coverage   # cobertura (umbral exigido en src/lib/finance/)
npm run check           # typecheck + lint + test (correr antes de cada commit de fase)
npx expo install <pkg>  # SIEMPRE para instalar dependencias (versiones compatibles con el SDK)
```

En Windows/PowerShell, dependencias de desarrollo: `npx expo install <pkg> "--" --dev` (o moverlas a `devDependencies` a mano).

## Estructura

```
src/
  app/                  # Expo Router: SOLO pantallas y layouts
    _layout.tsx         # fuentes, tema, Stack raíz con Stack.Protected (bloqueo)
    lock.tsx            # pantalla de bloqueo
    (app)/_layout.tsx   # Drawer con contenido personalizado
    (app)/<módulo>.tsx  # gastos/ y deudas/ son carpetas con Stack propio
  components/           # UI reutilizable (AppText, Button, Card, IconButton, EmptyState, Screen…)
  features/<módulo>/    # lógica y componentes por módulo (navigation/ tiene el drawer y la lista de módulos)
  lib/                  # utilidades puras
    finance/            # funciones matemáticas (salary, cashflow, expenses, debts, budget, goals, period, format, money, params)
  store/                # Zustand (lockStore, uiStore)
  theme/                # tokens de color, tipografía, espaciado + AppThemeProvider/useTheme
  db/ services/ types/  # (fase 3)
```

## Convenciones

- **Código en inglés, textos de UI en español.** Componentes de pantalla: `WalletScreen`, `DebtsScreen`, etc.; las rutas sí van en español (`/billetera`).
- **Colores solo desde `src/theme/`.** ESLint prohíbe literales `#hex`/`rgb()` fuera de `src/theme/`. Usar `useTheme().colors` o las props `color="primary"` de `AppText`/`Icon`.
- **Tipografía:** usar `<AppText variant=…>`, no `<Text>` directo.
- **Accesibilidad:** botones solo-ícono usan `IconButton` (exige `accessibilityLabel`); tamaño táctil ≥ `MIN_TOUCH_TARGET` (44).
- **Sin `any`** (regla de lint en error). Componentes pequeños.
- **Módulos del drawer:** se agregan en `src/features/navigation/modules.ts` (fuente única de ruta, título, ícono) + su archivo en `src/app/(app)/`.
- **Tests:** archivos `*-test.ts(x)` en carpetas `__tests__/` junto al código. RNTL v14 es asíncrono: `await render(...)`, `await fireEvent.press(...)`.
- **Estados:** cada pantalla con datos debe tener carga, vacío y error. Nunca datos falsos.

## Decisiones de arquitectura

- **Local-first:** SQLite es la fuente de verdad. La app no hace llamadas de red para funcionar.
- **Capa de repositorios** (`src/services/`, fase 3): una interfaz por entidad; pantallas y hooks nunca tocan SQLite directo (permite agregar sincronización en la nube más adelante).
- **IDs UUID + `created_at`/`updated_at`/`deleted_at`** (borrado lógico) en todas las tablas.
- **Dinero como enteros en pesos.** Se redondea una vez al final de cada cálculo con `src/lib/finance/money.ts`: `roundMoney` (Math.round) por defecto; `floorMoney` para límites de gasto (`calcSafeDailySpend`) y `ceilMoney` para montos necesarios (`calcMonthlySavingNeeded`), así nunca se sugiere gastar de más ni ahorrar de menos.
- **Todos los cálculos viven en `src/lib/finance/`** (puros, JSDoc, tests; importar desde `@/lib/finance`). Los componentes no calculan.
- **Porcentajes** se devuelven sin redondear, y `null` cuando no son calculables (ej.: sin ingreso); se muestran con `formatPercent`.
- **Fechas de calendario** (`IsoDate` = `yyyy-MM-dd`, hora local) para movimientos, vencimientos y metas; los timestamps (`created_at`…) van en ISO completo. `parseIsoDate` ignora la hora para evitar corrimientos de zona horaria.
- **Parámetros legales** (UF, UTM, topes, tramos, AFP, salud, cesantía, honorarios) en `src/lib/finance/params.ts`, aproximados y con fecha de referencia: toda pantalla que los use muestra `PARAMS_DISCLAIMER`. `IndicatorsSource` es el punto para actualizar UF/UTM desde una API en el futuro (hoy solo fuente estática, sin red).
- **Valores de enums en inglés:** movimientos `income | fixed_expense | ant_expense | debt_payment | adjustment` (solo `adjustment` lleva signo); deudas `pending | installment | variable`; estado de deuda `paid | on_time | due_soon | overdue`.
- **Período financiero:** `getFinancialPeriod(fecha, díaPago, 'calendar' | 'payday')`; `getDaysElapsed`/`getDaysRemaining` cuentan el día de hoy.
- **Bloqueo:** `useLockStore.isLocked` controla `Stack.Protected` en el layout raíz; `lock()` desde "Bloquear app" redirige a `/lock`.
- **Tema:** preferencia `system | light | dark` en `uiStore` (se persistirá en `settings` en fase 3); `AppThemeProvider` resuelve el esquema y también alimenta el tema de React Navigation.
- **Gráficos:** react-native-gifted-charts (funciona en Expo Go; victory-native requiere Skia).
- **Biometría:** en Expo Go funciona la huella en Android; Face ID en iOS solo en un build propio.

## Estado por fase

- [x] **Fase 1 — Base:** tema claro/oscuro, componentes base, Drawer con 8 módulos y "Bloquear app", pantallas vacías navegables.
  - Temporal hasta la fase 3: `lock.tsx` desbloquea con un botón (se reemplaza por PIN/biometría); el drawer muestra "Tu perfil" hasta que exista el perfil; la app parte desbloqueada y aún no hay onboarding.
- [x] **Fase 2 — `src/lib/finance/`:** sueldo (AFP, salud, cesantía, impuesto único, honorarios), período financiero, flujo, gastos (anualizar, hormiga, recurrentes), deudas (cuota francesa, amortización, estado, simulador bola de nieve/avalancha), presupuestos, metas y formato. Cobertura: 100% líneas, ~98% ramas.
- [ ] Fase 3 — SQLite + Drizzle, repositorios, onboarding, PIN/biometría, bloqueo, perfil
- [ ] Fase 4 — Inicio y Billetera
- [ ] Fase 5 — Gastos
- [ ] Fase 6 — Deudas
- [ ] Fase 7 — Extras (presupuestos, metas, calendario, reportes, CSV, respaldo)
- [ ] Fase 8 — Pulido y README
