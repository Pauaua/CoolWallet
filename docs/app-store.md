# Publicación en App Store — guía y textos

Textos listos para copiar en App Store Connect y pasos para publicar CoolWallet.
Los límites de caracteres entre paréntesis son los de Apple.

## Datos de la app

| Campo | Valor |
|---|---|
| Nombre (30) | `CoolWallet` |
| Subtítulo (30) | `Tus gastos y sueldo, claros` |
| Bundle ID | `cl.coolthings.coolwallet` |
| SKU | `coolwallet-ios` |
| Idioma principal | Español (México) — es el español disponible más cercano; la app está en español de Chile |
| Categoría principal | Finanzas |
| Categoría secundaria | Productividad |
| Precio | Gratis |
| Disponibilidad | Chile (los cálculos de sueldo son chilenos); se puede ampliar después |
| URL de política de privacidad | <https://github.com/Pauaua/CoolWallet/blob/main/docs/privacidad.md> |
| URL de soporte | <https://github.com/Pauaua/CoolWallet/blob/main/docs/soporte.md> |
| Copyright | `2026 Paulina Acuña` |

## Texto promocional (170)

```
Anota un gasto en dos toques y descubre cuánto puedes gastar hoy. Sin cuentas ni internet: tus datos se quedan en tu teléfono.
```

## Descripción (4000)

```
CoolWallet es tu control de gastos hecho para Chile: lo que entra, lo que sale, lo que debes y lo que te queda, en pesos y en un solo lugar.

TODO EN TU TELÉFONO
Sin cuentas, sin servidores y sin rastreo. Tus datos se guardan solo en tu dispositivo y la app funciona sin internet.

TU SUELDO LÍQUIDO, CALCULADO
Ingresa tu sueldo bruto y CoolWallet calcula el líquido con AFP, salud (Fonasa o Isapre), seguro de cesantía e impuesto único, o la retención si emites boletas de honorarios. La UF y la UTM se pueden actualizar a mano.

CUÁNTO PUEDES GASTAR HOY
Mira tu dinero disponible, cuánto puedes gastar por día sin quedar en rojo y cómo terminarías el mes si sigues a este ritmo, ya descontando los gastos fijos que faltan por pagar.

GASTOS FIJOS Y VARIABLES
• Gastos fijos (arriendo, cuentas, suscripciones) que se generan solos cada mes: solo los marcas como pagados.
• Gastos variables en dos toques: monto frecuente + categoría y listo.
• Top 3 del mes, costo anual de tus hábitos y comparación con el mes anterior.

DEUDAS BAJO CONTROL
Créditos en cuotas, tarjetas y lo que le debes a alguien. Registra abonos, ve cuántas cuotas te quedan, cuándo terminas y cuánto interés pagas. Compara las estrategias bola de nieve y avalancha para salir antes.

PRESUPUESTOS Y METAS
Límites por categoría con aviso al 80% y al 100%, sugerencia automática con la regla 50/30/20 y metas de ahorro con cuánto apartar cada mes.

CALENDARIO Y REPORTES
Vencimientos del mes con recordatorios, reportes de los últimos 6 meses, tasa de ahorro, evolución de tu deuda y exportación a CSV para Excel.

PROTEGIDA
PIN, Face ID y bloqueo automático al salir de la app. Respaldo en un archivo que tú guardas donde quieras.

Los valores legales (UF, UTM, topes, tasas y tramos) son aproximados y editables; verifícalos antes de tomar decisiones. CoolWallet es una herramienta de organización personal y no constituye asesoría financiera ni tributaria.
```

## Palabras clave (100, separadas por coma, sin espacios)

```
gastos,presupuesto,sueldo,finanzas,ahorro,deudas,billetera,pesos,chile,cuotas,liquido,afp,metas
```

## Novedades de esta versión (para 1.0.0)

```
Primera versión de CoolWallet.
```

## Privacidad de la app (App Store Connect → Privacidad de la app)

- ¿Recopilas datos de esta app? → **No, no recopilamos datos de esta app.**
- Resultado: etiqueta **"Datos no recopilados"**.

Es correcto porque la app no envía nada fuera del teléfono: no hay red, analítica, publicidad ni cuentas.

## Clasificación por edad

Responde **"Ninguno"** en todas las preguntas del cuestionario (no hay violencia, contenido sexual, apuestas, contenido generado por usuarios, chat ni navegador web). Resultado esperado: **4+**.

## Cumplimiento de exportación (cifrado)

Ya está resuelto en `app.json` (`ios.config.usesNonExemptEncryption: false`): la app solo usa el cifrado del sistema y un hash para el PIN, que están exentos. App Store Connect no debería preguntar en cada build.

## Notas para el revisor (App Review Information → Notes)

```
CoolWallet is a personal expense tracker for Chile. It works fully offline: there is no account, login, server or network access, and all data is stored locally on the device.

How to test:
1. Open the app and follow the onboarding: enter any name, any gross salary (e.g. 1.500.000) and create any 4–6 digit PIN. Biometrics can be skipped.
2. Use the menu (top-left) to browse Wallet, Expenses, Debts, Budgets, Goals, Calendar and Reports.
3. To add an expense: Expenses → Variables → "Registrar gasto", tap an amount, then tap a category.

No demo account is needed. Salary calculations use approximate Chilean legal values and the app shows this disclaimer; it is not financial or tax advice.
```

Datos de contacto del revisor: tu nombre, correo y teléfono (Apple no los publica).

## Capturas de pantalla

- **Obligatorias:** iPhone de 6,9" — **1320 × 2868** px (vertical). Mínimo 3, máximo 10.
- Apple escala estas capturas para los demás tamaños de iPhone.
- Sugerencia de orden: Billetera (disponible y gasto diario) → registro rápido de gasto → Gastos con dona → Deudas → Reportes → bloqueo con Face ID.
- Usa datos de ejemplo realistas, nunca tus datos reales.

## Pasos para publicar (desde Windows, sin Mac)

```bash
npm install -g eas-cli             # una vez
eas login                          # cuenta de Expo (gratis)
eas init                           # vincula el proyecto a Expo (agrega extra.eas.projectId en app.json)
eas build -p ios --profile production
eas submit -p ios --latest         # sube el build a App Store Connect
```

- La primera vez, `eas build` pide tu Apple ID y crea los certificados y perfiles de firma. Acepta que EAS los administre.
- Si pregunta por la **clave de notificaciones push**, puedes aceptarla. La app solo usa notificaciones locales, pero el módulo de notificaciones declara la capacidad push.
- El número de build se incrementa solo (`eas.json`: `appVersionSource: remote` + `autoIncrement`). Para una versión nueva visible al usuario, sube `version` en `app.json` (ej. `1.0.1`).
- El build llega a **TestFlight** en unos minutos. Pruébalo en un iPhone real antes de enviarlo a revisión, sobre todo Face ID, la foto de perfil, las notificaciones, y exportar e importar un respaldo.
