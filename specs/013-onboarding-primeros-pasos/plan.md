# Implementation Plan: Onboarding optimizado — "Primeros pasos"

**Branch**: `013-onboarding-primeros-pasos`
**Spec**: [spec.md](./spec.md) · **Research**: [research.md](./research.md)
**Created**: 2026-07-29
**Status**: Draft

## Architecture Overview

La feature se apoya en un hallazgo que la vuelve casi gratis (ver
[research.md](./research.md) R1): **el Dashboard ya tiene todos los datos que la guía
necesita**. Recibe la barbería completa por prop y ya trae los turnos por su cuenta. No hace
falta ni una consulta nueva, ni un endpoint, ni una tabla, ni una migración.

El corazón es una **función pura** —`getOnboardingSteps(barbershop, appointmentCount)`— que
recibe el estado de la barbería y devuelve la lista de pasos con su estado de cumplimiento.
Toda la lógica de "¿esto ya está configurado?" vive ahí, sin React y sin I/O, así que se
puede cubrir con el harness de tests que el proyecto ya tiene (`npm run test:unit`). La UI
es una tarjeta que renderiza lo que esa función devuelve.

La decisión que ordena todo lo demás es **derivar el avance en vez de persistirlo**. Un paso
está cumplido si el dato correspondiente **cambió respecto del valor que dejó el registro**
(FR-006). Eso trae tres cosas de arriba: no hay migración, las barberías que ya existen dan
completas solas sin backfill (FR-010, R4), y es imposible que la guía muestre un avance que
no coincida con la configuración real.

Para que ese "valor que dejó el registro" sea uno y no dos, los defaults salen de donde hoy
están escondidos (dentro del route handler del registro) a un módulo compartido que ambos
lados importan (R2).

## Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Origen de los datos | Prop `barbershop` + turnos que el Dashboard ya trae | Cero consultas nuevas en la primera pantalla del panel |
| Persistencia del avance | **Ninguna** — se deriva del estado real | Sin migración; imposible desincronizarse (R2, R4) |
| Fuente de los defaults | Módulo nuevo `src/lib/onboarding-defaults.ts` | Única fuente de verdad entre registro y guía |
| Lógica de cumplimiento | Función pura, sin React | Testeable con el harness que ya existe |
| "Ocultar la guía" | `localStorage` por barbería | Es preferencia de visualización, no dato del negocio (R3) |
| Plan vencido | `useIsReadOnly()` del `PlanContext` que ya existe | No ofrecer acciones que van a fallar (R5) |
| Ubicación | Arriba del Dashboard, sobre las métricas | El primer día no hay métricas que tapar (R6) |
| Compartir el link | Helper de WhatsApp del proyecto | No rearmar `wa.me` a mano (R7) |
| Dependencias nuevas | **Ninguna** | Constitución §5 |

## File-Level Changes

### New Files

- `src/lib/onboarding-defaults.ts` — los valores con los que el registro provisiona una
  barbería (servicio inicial, horario base) y los predicados que dicen si un dato **sigue**
  en ese valor. Módulo plano, server-safe, **sin `"use client"`** (gotcha de App Router:
  un módulo client no se puede importar desde el servidor).
- `src/lib/onboarding-steps.ts` — `getOnboardingSteps(barbershop, appointmentCount)`:
  función pura que devuelve los pasos con `id`, `title`, `hint`, `href`, `done` y si es
  opcional. Es la única definición de "qué es estar listo". Sin React, sin I/O.
- `src/components/admin/OnboardingChecklist.tsx` — client. La tarjeta: cuenta de avance,
  lista de pasos con su acceso directo, botón de ocultar, y —al completarse— el bloque
  compacto con el link público y el botón de compartir.
- `scripts/test-onboarding.ts` — casos unitarios de `getOnboardingSteps` (ver Testing
  Strategy).

### Modified Files

- `src/app/api/registro/route.ts` — deja de definir `DEFAULT_SERVICES` y
  `DEFAULT_WORKING_HOURS` en el archivo y los importa de `onboarding-defaults.ts`. **El
  comportamiento del registro no cambia en nada**; es una mudanza de constantes.
- `src/components/admin/AdminDashboard.tsx` — monta `OnboardingChecklist` arriba de las
  métricas, pasándole la barbería y la cantidad de turnos que ya tiene en el estado. Es el
  único cambio en el Dashboard.
- `package.json` — sumar `scripts/test-onboarding.ts` a `test:unit`.

### Deleted Files

Ninguno.

## Data Model Changes

**No aplica — y es una decisión, no una omisión.** El avance se deriva de datos que ya
existen (servicios, horario, datos de la barbería, turnos). Sin tabla nueva, sin columna
nueva, **sin migración**: nada que Bautista tenga que correr en el SQL Editor para que esta
feature funcione.

## API Surface

**No aplica.** No hay endpoints nuevos ni modificados. El único archivo de API que se toca
es el del registro, y solo para mudar dos constantes de lugar.

## UI / UX

### Component Hierarchy

```
/[slug]/admin (Dashboard)
└── AdminDashboard (client, ya existía)          ← MODIFICADO (monta la guía)
    ├── OnboardingChecklist (client)             ← NUEVO
    │   ├── [estado incompleto] avance N/M + lista de pasos con link
    │   └── [estado completo]   link público + compartir por WhatsApp
    └── [métricas y agenda del día, sin cambios]
```

### Pasos de la guía

| # | Paso | Cumplido cuando | Va a |
|---|---|---|---|
| 1 | Poné tus servicios y precios | hay más de un servicio, o el único dejó de ser el del registro | `/[slug]/admin/barbers` |
| 2 | Revisá tus días y horarios | el horario dejó de ser el del registro | `/[slug]/admin/barbers` |
| 3 | Completá los datos de tu barbería | dirección **e** Instagram con contenido | `/[slug]/admin/settings` |
| 4 | Subí tu logo *(opcional)* | `logoUrl` cargado | `/[slug]/admin/settings` |
| 5 | Probá una reserva *(opcional)* | la barbería ya tiene al menos un turno | `/[slug]` (su landing) |
| 6 | Compartí tu link | los pasos obligatorios están listos | copiar / WhatsApp |

Los pasos opcionales cuentan para el avance visible pero **no bloquean** que la guía se
considere terminada (FR-101, FR-102): "listo" = los pasos 1, 2 y 3.

### Key Interactions

- **Entrar al panel recién registrado** → la guía es lo primero, con 0 de 3 obligatorios.
- **Tocar un paso** → va derecho a la pantalla que lo resuelve.
- **Volver al Dashboard después de configurar** → el paso ya figura cumplido, sin marcarlo.
- **Completar los tres obligatorios** → la guía colapsa al bloque del link y las métricas
  vuelven a ser lo primero.
- **Tocar "compartir"** → abre WhatsApp con su link público listo para mandar.
- **Tocar "ocultar"** → la guía desaparece del Dashboard y queda un acceso para volver a
  mostrarla.
- **Plan vencido** → la guía muestra solo el link; sin accesos directos de configuración.

## Testing Strategy

- **Unit tests** (`npm run test:unit`, el harness liviano del repo — sin vitest):
  `scripts/test-onboarding.ts` sobre `getOnboardingSteps`, que es donde vive el riesgo real.
  Casos:
  1. Barbería tal como la deja el registro → los 3 obligatorios pendientes.
  2. Servicio con el precio cambiado → paso 1 cumplido.
  3. Servicio extra agregado, el genérico intacto → paso 1 cumplido.
  4. Servicio idéntico al del registro → paso 1 **pendiente** (el caso trampa de FR-006).
  5. Horario cambiado (inicio / fin / intervalo, uno por caso) → paso 2 cumplido.
  6. Dirección sí pero Instagram vacío → paso 3 pendiente.
  7. Barbería vieja bien configurada → todo cumplido, guía terminada (FR-010).
  8. `appointmentCount > 0` → paso 5 cumplido.
  9. Solo opcionales pendientes → la guía cuenta como terminada.

  > **Gotcha del harness:** el runner no resuelve el alias `@/`; hay que correrlo con
  > `--import ./scripts/register-alias.mjs`, que ya está en el script `test:unit`.

- **Build verification**: `npx tsc --noEmit`, `npm run lint`, `npm run build` en verde.

- **Manual smoke tests**:
  1. Registrar una barbería nueva de prueba y confirmar que cae en el panel con la guía en
     0 de 3.
  2. Recorrer los pasos y ver cómo se van tachando solos.
  3. Ocultar la guía, recargar, y volver a mostrarla.
  4. Entrar con una barbería ya configurada (`sv-barber`) y confirmar que **no** ve pasos
     pendientes.
  5. Entrar con una barbería vencida y confirmar que no hay accesos de configuración.
  6. Todo el recorrido en pantalla de celular.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Que el registro cambie su servicio o horario inicial y la guía quede mintiendo | Los defaults son un módulo único que el registro **importa**; si cambian, cambian para los dos. Los tests fijan el contrato |
| Falso "ya está configurado" en barberías nuevas | FR-006 y el caso 4 de los tests: coincidir con el default cuenta como pendiente, no como hecho |
| Que la guía moleste al barbero veterano | Se puede ocultar (FR-009) y colapsa sola al completarse (FR-008) |
| Regresión en el registro al mudar las constantes | Es una mudanza sin cambio de valores; se verifica registrando una barbería de prueba (smoke test 1) |
| Que el Dashboard se vuelva más lento | Cero consultas nuevas: la guía es una función pura sobre datos que ya estaban en memoria |
| Alcance que se estira a un tour interactivo | El spec lo marca explícitamente fuera de alcance (Won't Have) |

## Rollback Plan

Feature sin migración y sin cambios de datos: el rollback es trivial.

- Revertir el merge commit de `013-onboarding-primeros-pasos` en `main` y redeployar.
- Nada que revertir en la base. Ninguna barbería queda en un estado raro: la guía no
  escribe.
- El único cuidado es que la reversión también devuelve las constantes al route handler del
  registro — que es su estado actual, así que no hay nada que reconciliar.

## Constitution Check

| Principio | Estado | Nota |
|---|---|---|
| 1. Multi-tenant first | ✅ | La guía se calcula por barbería; nada atado a SV Barber. La clave de "ocultar" es por slug |
| 2. Mobile-first | ✅ | Una columna y áreas de toque cómodas en celular (R6) |
| 3. Estética premium minimal | ✅ | `card-premium` + tokens existentes; sin colores ni tokens nuevos |
| 4. Español rioplatense | ✅ | Todo el copy de los pasos, en rioplatense |
| 5. Stack discipline | ✅ | **Cero dependencias nuevas** |
| 6. No half-finished | ✅ | tsc + lint + build + unit tests verdes antes de cerrar |
| 7. Branch workflow | ✅ | Rama `013-onboarding-primeros-pasos` desde `main`, merge `--no-ff` |
| 8. Spec-driven | ✅ | spec → research → plan → tasks |

**Sin violaciones. Sin excepciones que documentar.**

## Next Steps

- Run **speckit-tasks** to decompose this plan into a dependency-ordered task list
