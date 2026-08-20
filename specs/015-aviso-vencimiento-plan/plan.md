# Implementation Plan: Aviso de vencimiento del plan

**Branch**: `015-aviso-vencimiento-plan` | **Date**: 2026-08-19
**Spec**: [spec.md](./spec.md)

## Technical Context

**Lenguaje**: TypeScript · Next.js 16 (App Router) · Supabase Postgres
**Dependencias nuevas**: ninguna
**Migración**: sí, una tabla nueva (aditiva)
**Testing**: `npm run test:unit` (Node test runner propio, sin framework)
**Alcance**: panel del barbero + proceso automático horario

Todo lo que hace falta ya existe en el repo:

| Pieza | Estado |
|---|---|
| `daysToPaidExpire` | ya se calcula en `resolvePlanStatus` y llega al contexto del panel — **hoy no lo muestra nadie** |
| `PlanStatusBanner` | ya tiene el botón Pagar con alias/CBU/titular (`TransferDetailsCard`) |
| Cron horario | `/api/cron/reminders`, disparado por GitHub Actions, con `?force=true` para probar |
| Hora argentina | `getArgParts()` en el cron, vía `Intl` con timezone explícito |
| Envío de push | insertar en `push_notification_queue` dispara el webhook que envía |
| Quién administra | tabla `barbershop_admins` (`user_id` + `barbershop_slug`) |

## Constitution Check

| Principio | Cumple | Cómo |
|---|---|---|
| 1. Multi-tenant first | ✅ | Todo se consulta y se guarda por `barbershop_slug` |
| 2. Mobile-first | ✅ | El cartel ya es responsive; el push es el canal más móvil que hay |
| 3. Estética premium | ✅ | Reusa `BannerBase` y el modal que ya existen, sin inventar estilos |
| 4. Español rioplatense | ✅ | "Te quedan 3 días", "Renová tu plan" |
| 5. Stack discipline | ✅ | Cero dependencias nuevas |
| 6. Nada a medias | ✅ | Incluye migración, tests y verificación |
| 7. Branch workflow | ✅ | Rama `015-aviso-vencimiento-plan` |
| 8. Spec-driven | ✅ | spec → plan → tasks |

Sin violaciones que justificar.

## Arquitectura

```
                       ┌──────────────────────────┐
GitHub Actions ──cada──▶ /api/cron/reminders      │
   (cada hora)   hora  │                          │
                       │  paso 1: turnos (ya está)│
                       │  paso 2: planes (NUEVO)  │
                       └───────────┬──────────────┘
                                   │
                     ┌─────────────▼──────────────┐
                     │ plan-notices.ts (puro)     │
                     │ vencimiento + hoy → hito   │
                     └─────────────┬──────────────┘
                                   │ 'vence_3d' | 'vence_hoy' | null
                     ┌─────────────▼──────────────┐
                     │ plan_notice_log            │
                     │ único(slug, kind, vence)   │  ← el insert es el candado
                     └─────────────┬──────────────┘
                                   │ si insertó, es la primera vez
                     ┌─────────────▼──────────────┐
                     │ push_notification_queue    │ → webhook → celular
                     │ una fila por dispositivo   │
                     └────────────────────────────┘

Panel:  PlanContext.daysToPaidExpire ──▶ PlanStatusBanner (rama nueva)
                                              └─▶ botón Pagar ─▶ alias/CBU
```

**El insert es el candado, no un `select` previo.** El índice único sobre
`(barbershop_slug, kind, period_ends_at)` hace que la segunda corrida del
mismo hito falle con violación de unicidad, y esa falla se lee como "ya se
avisó". Si en cambio se preguntara "¿ya existe?" y después se insertara, dos
corridas superpuestas del cron mandarían el push dos veces.

## Decisiones de diseño

### Por qué una tabla nueva y no `reminder_log`

`reminder_log.appointment_id` es `not null` y referencia `appointments`. Estos
avisos son de una barbería, no de un turno: no hay ningún id de turno que
poner.

### Por qué la clave incluye la fecha de vencimiento

Si fuera `(slug, kind)` a secas, el aviso se mandaría **una sola vez en la vida
de la barbería**: al renovar y volver a vencer el mes siguiente, la fila ya
existiría y el insert fallaría para siempre. Con el vencimiento adentro, cada
período es un aviso nuevo.

### Por qué "3 días o menos" y no "exactamente 3"

Con la regla exacta, una barbería que al activarse la feature ya está a 2 días
nunca recibiría el primer aviso. Es el caso de `leocuts`, que vence el 21/08.

### Por qué el push no lleva el alias ni el CBU

Una notificación no se puede copiar y un CBU de 22 dígitos ahí se lee mal. El
push abre el panel, donde el botón Pagar muestra los datos con el formato
correcto y el monto del plan.

## Phase 1 — Artefactos

- [data-model.md](./data-model.md) — la tabla nueva
- [quickstart.md](./quickstart.md) — cómo probarlo sin esperar tres días

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El paso nuevo rompe el cron de turnos | Va en su propio `try/catch`: si falla, se reporta a Sentry y los recordatorios de turnos siguen (FR-011) |
| Se manda el push de más | El índice único lo impide aunque el cron corra dos veces en paralelo |
| Se manda a un barbero empleado | Solo se toman las suscripciones cuyo `user_id` está en `barbershop_admins` |
| Un push falla y corta el resto | Cada barbería se procesa por separado; un error se acumula en el reporte |
