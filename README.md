# Control de Gastos

App móvil para ver con claridad tu flujo de dinero: lo que entra, lo que sale, lo que debes y lo que te queda. Interfaz en español (Chile) y montos en pesos chilenos (CLP).

**Funciona 100% sin internet.** Todos los datos viven en tu teléfono: no hay servidores, cuentas de usuario ni sincronización. Para no perder tu información, usa los respaldos (ver más abajo).

## Qué hace

| Módulo | Para qué sirve |
|---|---|
| **Inicio** | Resumen (sueldo líquido, gastado del mes, disponible, deudas), perfil, configuración, seguridad y respaldos. |
| **Billetera** | Dinero disponible (suma de tus cuentas), registro del sueldo en un toque, ingresos extra, ajustes de saldo, % gastado, cuánto puedes gastar por día, proyección al cierre del mes, flujo del mes e historial con filtros. |
| **Gastos** | Gastos fijos que se generan solos cada mes (solo los marcas como pagados) y gastos variables con registro rápido en dos toques, top 3, costo anual y gráfico por categoría. |
| **Deudas** | Deudas pendientes, en cuotas y variables; abonos, cuotas restantes, término estimado, intereses, semáforo deuda/ingreso y simulador bola de nieve vs avalancha. |
| **Presupuestos** | Límite mensual por categoría con alertas al 80% y 100%, y la regla 50/30/20. |
| **Metas de ahorro** | Cuánto ahorrar al mes para llegar a cada meta y tu avance. |
| **Calendario** | Vencimientos del mes y recordatorios 1 o 2 días antes (notificaciones locales; no disponibles en Expo Go para Android). |
| **Reportes** | Últimos 6 meses, tasa de ahorro, evolución de la deuda, observaciones automáticas y exportación a CSV. |

La app está protegida con un PIN de 4 a 6 dígitos y, si quieres, con tu huella o Face ID.

## Probarla en tu celular con Expo Go

### 1. Requisitos

- **En el computador:** [Node.js](https://nodejs.org/) 20 LTS o superior (probada con Node 24) y Git.
- **En el teléfono:** la app **Expo Go** ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) · [iPhone](https://apps.apple.com/app/expo-go/id982107779)), actualizada. El proyecto usa **Expo SDK 57**: Expo Go debe ser compatible con esa versión (la versión más reciente de las tiendas lo es).
- El computador y el teléfono conectados a la **misma red Wi‑Fi** (o usa el modo túnel, ver más abajo).

### 2. Instalar

```bash
git clone <url-del-repositorio> control-gastos
cd control-gastos
npm install
```

### 3. Iniciar

```bash
npx expo start
```

En la terminal aparecerá un **código QR**:

- **Android:** abre Expo Go y toca **“Scan QR code”**.
- **iPhone:** abre la app **Cámara**, apunta al código y toca el aviso para abrir en Expo Go.

La primera carga tarda un poco (se arma el paquete de la app). Luego verás la bienvenida: ingresa tu nombre, tu sueldo, crea tu PIN y listo.

> **¿No conecta?** Si el teléfono y el computador no ven la misma red (Wi‑Fi de oficina, VPN, etc.), usa el modo túnel:
>
> ```bash
> npx expo start --tunnel
> ```
>
> La primera vez puede pedir instalar `@expo/ngrok`. El túnel solo sirve para cargar la app durante el desarrollo; **la app en sí no usa internet**.

### 4. Problemas comunes

| Síntoma | Qué hacer |
|---|---|
| Expo Go dice que el proyecto es de otra versión del SDK | Actualiza Expo Go desde la tienda. |
| Cambios que no aparecen o errores raros al cargar | `npx expo start -c` (limpia la caché). |
| “Network response timed out” | Revisa que estén en la misma Wi‑Fi o usa `--tunnel`. |
| La huella o Face ID no aparecen | En Expo Go funciona la huella en Android. **Face ID en iPhone requiere un build propio** (no Expo Go); mientras tanto, entra con tu PIN. |
| No puedo activar los recordatorios | **En Android con Expo Go no hay notificaciones** (Expo Go las quitó desde el SDK 53); la app lo indica y todo lo demás funciona igual. En iPhone con Expo Go, o en una versión instalada de la app (build propio), actívalos en *Inicio → Configuración → Notificaciones*. Son locales: no necesitan internet. |

## Tus datos

- Se guardan en una base de datos **SQLite dentro del teléfono**. Nada sale del dispositivo salvo que tú exportes un archivo.
- El PIN se guarda solo como huella cifrada (hash con sal) en el almacenamiento seguro del sistema; nunca en texto plano ni en los respaldos.
- **Respaldo:** en *Inicio → Respaldo y datos → Exportar respaldo* se crea un archivo `.json` que puedes guardar en Drive, correo, WhatsApp o Archivos. Para recuperarlo: *Importar respaldo* (o, si olvidaste el PIN, *Olvidé mi PIN → Restaurar un respaldo*). La app puede recordarte respaldar cada 7, 14 o 30 días.
- **Borrar datos:** *Respaldo y datos → Borrar todos los datos* (pide doble confirmación).
- **Si desinstalas la app o borras sus datos sin un respaldo, la información se pierde.**

## Valores legales aproximados

El cálculo del sueldo líquido usa UF, UTM, topes imponibles, tramos del impuesto único, tasas de AFP, salud, seguro de cesantía y retención de honorarios **aproximados** (referencia: septiembre de 2026, en `src/lib/finance/params.ts`). La app lo indica en cada pantalla donde se usan. Verifica los valores vigentes (SII, Superintendencia de Pensiones) y actualiza la UF y la UTM en *Configuración → Indicadores*.

## Para desarrollar

```bash
npm run typecheck      # TypeScript (tsc --noEmit)
npm run lint           # ESLint
npm test               # pruebas (Jest)
npm run test:coverage  # cobertura (umbral exigido para src/lib/finance)
npm run check          # las tres anteriores juntas
npm run db:generate    # nueva migración tras cambiar src/db/schema.ts
```

Instala dependencias siempre con `npx expo install <paquete>` para que las versiones calcen con el SDK.

**Stack:** Expo SDK 57 · React Native · TypeScript estricto · Expo Router (drawer) · SQLite (`expo-sqlite`) + Drizzle ORM · TanStack Query · Zustand · react-hook-form + zod · react-native-gifted-charts · date-fns.

**Estructura principal:**

```
src/
  app/            pantallas y navegación (Expo Router)
  components/     componentes de interfaz reutilizables
  features/       lógica por módulo (consultas, formularios, componentes)
  lib/finance/    cálculos financieros puros, con pruebas
  db/             esquema, migraciones y datos iniciales
  services/       repositorios (única puerta a los datos), seguridad, archivos, respaldo
  theme/          colores, tipografía y espaciado (modo claro y oscuro)
```

Las convenciones y decisiones de arquitectura están en [`CLAUDE.md`](./CLAUDE.md). El ícono se regenera con `node scripts/generate-icons.js`.
