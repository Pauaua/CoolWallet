@AGENTS.md

# Control de Gastos — guía del proyecto

App móvil **local-first** de control de gastos personales. UI en **español (Chile)**, montos en **CLP**.
Sin backend, sin cuentas, sin llamadas de red: todo vive en el dispositivo. Se prueba con **Expo Go**.

## Stack

- Expo SDK 57 · React Native 0.86 · React 19 · TypeScript 6 (`strict`, `noUncheckedIndexedAccess`)
- Expo Router (rutas en `src/app/`) · Drawer incluido en `expo-router/drawer` (no se instala `@react-navigation/drawer` desde SDK 56)
- date-fns · Zustand (estado de UI) · Inter vía `@expo-google-fonts/inter` · íconos Feather (`@expo/vector-icons`)
- `expo-sqlite` + Drizzle ORM 0.45 (migraciones de `drizzle-kit`) · TanStack Query v5 · react-hook-form + zod v4
- `expo-secure-store` (hash del PIN) · `expo-local-authentication` · `expo-crypto` · `expo-image-picker` + `expo-file-system` (foto de perfil)
- Jest (`jest-expo`) + `@testing-library/react-native` v14 · `better-sqlite3` (solo tests de repositorios)
- Próximas fases: react-native-gifted-charts, expo-notifications, expo-sharing, expo-document-picker.

## Comandos

```bash
npx expo start          # servidor de desarrollo (escanear QR con Expo Go)
npm run typecheck       # tsc --noEmit
npm run lint            # expo lint (ESLint flat config)
npm test                # jest
npm run test:coverage   # cobertura (umbral exigido en src/lib/finance/)
npm run check           # typecheck + lint + test (correr antes de cada commit de fase)
npm run db:generate     # tras cambiar src/db/schema.ts: genera la migración en src/db/migrations/
npx expo install <pkg>  # SIEMPRE para instalar dependencias (versiones compatibles con el SDK)
```

En Windows/PowerShell, dependencias de desarrollo: `npx expo install <pkg> "--" --dev` (o moverlas a `devDependencies` a mano).

## Estructura

```
src/
  app/                  # Expo Router: SOLO pantallas y layouts
    _layout.tsx         # providers, arranque (migraciones) y Stack.Protected: onboarding / bloqueo / app
    (onboarding)/       # bienvenida → nombre → sueldo → PIN → biometría
    lock.tsx            # pantalla de bloqueo (PIN / biometría)
    olvide-pin.tsx      # restablecer borrando datos
    (app)/_layout.tsx   # Drawer con contenido personalizado (+ pantallas secundarias con "Volver")
    (app)/<módulo>.tsx  # gastos/ y deudas/ son carpetas con Stack propio
    (app)/perfil.tsx, sueldo.tsx, configuracion.tsx, historial.tsx, categorias.tsx, seguridad.tsx, cambiar-pin.tsx
    (modals)/           # formularios modales: nuevo-ingreso, ajustar-saldo, cuenta, movimiento/[id], gasto-rapido, gasto-fijo, categoria
  components/           # UI reutilizable (AppText, Button, TextField, AmountField, SegmentedControl, PinPad, StateViews…)
  features/<módulo>/    # hooks (TanStack Query), formularios (zod) y componentes por módulo
  lib/                  # utilidades puras
    finance/            # funciones matemáticas (salary, cashflow, expenses, debts, budget, goals, period, format, money, params)
  db/                   # schema.ts (Drizzle), migrations/ (generadas), seed.ts, client.ts, testing/testDb.ts
  services/             # types.ts (interfaces de repositorio), sqlite/ (implementación), security/ (PIN, biometría), files/
  store/                # Zustand (sessionStore: onboarding/bloqueo; uiStore: tema)
  theme/                # tokens de color, tipografía, espaciado + AppThemeProvider/useTheme
  types/                # enums.ts (valores de columnas), models.ts (tipos de entidades)
```

## Convenciones

- **Código en inglés, textos de UI en español.** Componentes de pantalla: `WalletScreen`, `DebtsScreen`, etc.; las rutas sí van en español (`/billetera`).
- **Colores solo desde `src/theme/`.** ESLint prohíbe literales `#hex`/`rgb()` fuera de `src/theme/`. Usar `useTheme().colors` o las props `color="primary"` de `AppText`/`Icon`.
- **Tipografía:** usar `<AppText variant=…>`, no `<Text>` directo.
- **Accesibilidad:** botones solo-ícono usan `IconButton` (exige `accessibilityLabel`); tamaño táctil ≥ `MIN_TOUCH_TARGET` (44).
- **Sin `any`** (regla de lint en error). Componentes pequeños.
- **Módulos del drawer:** se agregan en `src/features/navigation/modules.ts` (fuente única de ruta, título, ícono) + su archivo en `src/app/(app)/`.
- **Tests:** archivos `*-test.ts(x)` en carpetas `__tests__/` junto al código. RNTL v14 es asíncrono: `await render(...)`, `await fireEvent.press(...)`.
- **Estados:** cada pantalla con datos debe tener carga, vacío y error (`LoadingState`, `EmptyState`, `ErrorState`). Nunca datos falsos.
- **Formularios:** react-hook-form + `zodResolver`. Los montos y decimales se editan como texto (`AmountField` pone puntos de miles) y el esquema zod los transforma a número (`parseCLPInput`/`parseDecimalInput`); texto inválido → `NaN` para que falle con mensaje. Mensajes de error en español. Tipar con `useForm<z.input, unknown, z.output>`.
- **Datos en pantallas:** siempre vía hooks de `src/features/*/queries.ts` (TanStack Query sobre `useRepositories()`); nunca importar `@/db` desde pantallas o componentes.
- **UI del sistema** (galería, compartir, biometría): envolver con `withoutAutoLock()` para que al volver no se bloquee la app.

## Decisiones de arquitectura

- **Local-first:** SQLite es la fuente de verdad. La app no hace llamadas de red para funcionar.
- **Capa de repositorios** (`src/services/`, fase 3): una interfaz por entidad; pantallas y hooks nunca tocan SQLite directo (permite agregar sincronización en la nube más adelante).
- **IDs UUID + `created_at`/`updated_at`/`deleted_at`** (borrado lógico) en todas las tablas.
- **Dinero como enteros en pesos.** Se redondea una vez al final de cada cálculo con `src/lib/finance/money.ts`: `roundMoney` (Math.round) por defecto; `floorMoney` para límites de gasto (`calcSafeDailySpend`) y `ceilMoney` para montos necesarios (`calcMonthlySavingNeeded`), así nunca se sugiere gastar de más ni ahorrar de menos.
- **Todos los cálculos viven en `src/lib/finance/`** (puros, JSDoc, tests; importar desde `@/lib/finance`). Los componentes no calculan.
- **Porcentajes** se devuelven sin redondear, y `null` cuando no son calculables (ej.: sin ingreso); se muestran con `formatPercent`.
- **Fechas de calendario** (`IsoDate` = `yyyy-MM-dd`, hora local) para movimientos, vencimientos y metas; los timestamps (`created_at`…) van en ISO completo. `parseIsoDate` ignora la hora para evitar corrimientos de zona horaria.
- **Parámetros legales** (UF, UTM, topes, tramos, AFP, salud, cesantía, honorarios) en `src/lib/finance/params.ts`, aproximados y con fecha de referencia: toda pantalla que los use muestra `PARAMS_DISCLAIMER`. `IndicatorsSource` es el punto para actualizar UF/UTM desde una API en el futuro (hoy solo fuente estática, sin red).
- **Valores de enums en inglés:** movimientos `income | fixed_expense | variable_expense | debt_payment | adjustment` (solo `adjustment` lleva signo); deudas `pending | installment | variable`; estado de deuda `paid | on_time | due_soon | overdue`.
- **Período financiero:** `getFinancialPeriod(fecha, díaPago, 'calendar' | 'payday')`; `getDaysElapsed`/`getDaysRemaining` cuentan el día de hoy.
- **Repositorios:** interfaces en `src/services/types.ts`; implementación SQLite en `src/services/sqlite/` tipada contra `AppDatabase` (`BaseSQLiteDatabase<'sync'>`), así la app usa expo-sqlite y los tests better-sqlite3 en memoria **con las mismas migraciones**. Dentro de `db.transaction` usar solo métodos síncronos (`.run()`, `.all()`, `.get()`). Contexto inyectable (`newId`, `now`).
- **Filas únicas:** `profile` y `settings` tienen una sola fila activa; `settings.get()` la crea con valores por defecto si falta.
- **Colores de categorías/cuentas** se guardan como claves de paleta (`forest`, `emerald`…, ver `CATEGORY_COLORS`), no como hex.
- **Arranque** (`useAppBootstrap`): migraciones → seed (solo si no hay categorías, contando borradas) → perfil/config/PIN. Onboarded = perfil + PIN + `settings.onboardingCompletedAt`. Si está onboarded, la app parte bloqueada.
- **Acceso:** `sessionStore` (`isOnboarded`, `isLocked`) controla los `Stack.Protected` del layout raíz. "Bloquear app" → `lock()`. Bloqueo automático al volver de segundo plano tras `settings.lockTimeoutMinutes` (0 = inmediato).
- **PIN:** 4–6 dígitos; en `expo-secure-store` se guarda solo SHA-256(sal:PIN) con sal aleatoria de 16 bytes, y el largo del PIN. Tras 5 fallos, bloqueo temporal de 30 s que se duplica (máx. 15 min). La protección real es el almacenamiento seguro del sistema + el límite de intentos.
- **Restablecer** (`useResetApp`): `wipeAll` (borrado físico, hijos antes que padres) + PIN + fotos → seed → onboarding.
- **Modelo de dinero (decidido con la persona):** "Dinero disponible" = suma de los saldos de las cuentas (saldo inicial + movimientos; una tarjeta con deuda resta). El sueldo se registra con un toque desde la tarjeta "¿Recibiste tu sueldo?" (monto = líquido calculado, editable) como ingreso con `transactions.is_salary = true`; se pregunta desde la fecha de pago del período hasta que se registra. Mientras falta, el sueldo esperado cuenta como ingreso de referencia (% gastado, gasto diario seguro, proyección).
- **Gastos fijos y variables (decidido con la persona):** lo que el enunciado llamaba "gasto hormiga" se llama **gasto variable** (`variable_expense`, categorías `kind = 'variable'`); la migración `0002` convierte datos antiguos. Los gastos fijos generan vencimientos por período en `fixed_expense_occurrences` (`usePeriodOccurrences` sincroniza de forma idempotente); marcar pagado crea el movimiento en una transacción de BD, y eliminar ese movimiento deja el vencimiento pendiente.
- **Ritmo de gasto:** el promedio diario, el gasto diario seguro y la proyección usan solo **gastos variables**; los fijos por pagar se descuentan como compromiso conocido (`calcFreeToSpend`, `projectClosingBalance`).
- **Resumen de Billetera:** `buildWalletSummary` (`features/wallet/walletSummary.ts`) solo combina funciones de `lib/finance` (`calcAccountBalances`, `summarizePeriodFlow`, `projectClosingBalance`…); tiene tests.
- **Formularios modales** en `src/app/(modals)/` (ingreso extra, ajustar saldo, cuenta, movimiento/[id]); pantallas secundarias del drawer (perfil, sueldo, configuración, historial, seguridad, cambiar PIN) muestran "Volver".
- **Gráficos:** colores de series en tokens `chartIncome/chartExpense/chartDebt` (claro y oscuro validados con el validador de paletas: banda de luminosidad, croma, daltonismo, contraste). Los colores de estado (`success/warning/danger`) no se usan como series. El flujo del mes se dibuja con barras horizontales propias (3 valores con etiqueta y monto directo); la dona por categoría usa react-native-gifted-charts (máx. 6 porciones, resto en "Otras", separación de 2px y leyenda con ícono, nombre, monto y %). La paleta de categorías (`src/theme/categoryColors.ts`) pasa luminosidad y croma en ambos modos; como la persona elige colores, los gráficos nunca dependen solo del color.
- **Fechas:** `@react-native-community/datetimepicker` (incluido en Expo Go) vía `DateField`; formato en español con `src/lib/dates.ts`.
- **UF/UTM editables** en Configuración (`settings.uf_value/utm_value`); `buildSalaryParams(settings)` los usa o cae a los valores por defecto de `params.ts`.
- **Tema:** preferencia `system | light | dark` guardada en `settings.theme` y reflejada en `uiStore`; `AppThemeProvider` resuelve el esquema y también alimenta el tema de React Navigation.
- **Gráficos:** react-native-gifted-charts (funciona en Expo Go; victory-native requiere Skia).
- **Biometría:** en Expo Go funciona la huella en Android; Face ID en iOS solo en un build propio.

## Estado por fase

- [x] **Fase 1 — Base:** tema claro/oscuro, componentes base, Drawer con 8 módulos y "Bloquear app", pantallas vacías navegables.
- [x] **Fase 2 — `src/lib/finance/`:** sueldo (AFP, salud, cesantía, impuesto único, honorarios), período financiero, flujo, gastos (anualizar, hormiga, recurrentes), deudas (cuota francesa, amortización, estado, simulador bola de nieve/avalancha), presupuestos, metas y formato. Cobertura: 100% líneas, ~98% ramas.
- [x] **Fase 3 — Datos y acceso:** esquema de 11 tablas + migración inicial, seed, repositorios (perfil, configuración, cuentas, categorías, datos), onboarding, PIN con bloqueo por intentos, biometría, bloqueo automático, "Olvidé mi PIN", perfil con foto y pantalla de seguridad.
  - Pendiente en fase 7: en "Olvidé mi PIN", la opción **restaurar un respaldo** (requiere la importación de respaldos).
- [x] **Fase 4 — Inicio y Billetera:** resumen (líquido, gastado, disponible), desglose del sueldo, configuración (mes financiero, tema, moneda, UF/UTM), cuentas con saldo, ingresos extra, ajustes de saldo, registro del sueldo en un toque, % gastado, gasto diario promedio y seguro, proyección al cierre, flujo del mes e historial con filtros. Migración `0001` (flag de sueldo e índice por cuenta).
  - Pendiente en fase 6: la tarjeta "Deudas" de Inicio muestra "—" y lleva al módulo hasta que existan deudas; ahí se conecta al total real.
- [x] **Fase 5 — Gastos:** gastos fijos (vencimientos por período, marcar pagado/pendiente, próximo vencimiento, pausar), gastos variables con registro rápido (montos frecuentes + categoría en 2 toques), total, % del ingreso, costo anual, top 3, dona por categoría y comparación con el mes anterior; gestión de categorías (ícono, color, grupo 50/30/20). Migración `0002` (hormiga → variable).
- [ ] Fase 6 — Deudas
- [ ] Fase 7 — Extras (presupuestos, metas, calendario, reportes, CSV, respaldo)
- [ ] Fase 8 — Pulido y README
