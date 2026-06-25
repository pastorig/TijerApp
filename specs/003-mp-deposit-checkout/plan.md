# Implementation Plan: Cobro de seña con MercadoPago al reservar

**Branch**: `003-mp-deposit-checkout`
**Spec**: spec.md
**Created**: 2026-06-21
**Status**: Draft

## Architecture Overview

La base de datos ya está lista (migración `20260607210000_mercadopago_deposits.sql`): columnas de seña en `appointments`, config MP en `barbershops`, tabla `payment_events`, índices y RLS. **No hace falta migración nueva.** Esta feature construye solo la capa de aplicación: crear el link de pago, recibir la confirmación, confirmar el turno y auto-cancelar lo impago.

**Decisión central — reusar el `status='pending'` para retener el horario.** El índice único parcial `appointments_unique_active_slot` ya bloquea el slot para turnos `pending`/`confirmed`. Entonces un turno con seña pendiente se crea como `pending` (que retiene el horario), pasa a `confirmed` cuando se paga, y a `cancelled` cuando expira (lo que libera el slot). No necesitamos un estado nuevo ni lógica de retención aparte.

**Decisión central — todo lo que toca el `access_token` de MercadoPago va server-side.** El token es un secreto por barbería; nunca debe llegar al cliente. Por eso la reserva con seña deja de hacerse con el insert anónimo de Supabase (como hoy las reservas sin seña) y pasa por un route handler server-side que: inserta el turno con `service_role`, calcula la seña, crea la *preference* de MP con el token de esa barbería, guarda los datos de pago en el turno y devuelve al cliente solo el `init_point` (link de pago) — nunca el token. El flujo sin seña (`mp_enabled=false`) queda EXACTAMENTE como hoy.

El webhook de MP y el cron de auto-cancelación/recordatorio corren server-side con `service_role` (igual que el cron de recordatorios actual, autenticado por `CRON_SECRET`).

## Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Retención de horario | Reusar `status='pending'` + índice único existente | El slot ya queda bloqueado sin lógica nueva; expirar = `cancelled` lo libera |
| Llamadas a la API de MP | `fetch` nativo en `src/lib/mercadopago/client.ts` | Ya es el patrón existente (`testMPConnection`); evita sumar el SDK pesado |
| Manejo del secret (access_token) | Solo en route handlers server-side con `service_role` | El token nunca debe exponerse al cliente |
| Creación de reserva con seña | Nuevo route `POST /api/appointments/book` (solo cuando `mp_enabled`) | Atómico: inserta turno + crea preference + persiste; valida monto server-side |
| Identificar la barbería en el webhook | `notification_url` con `?bs=<slug>` | El webhook sabe qué `access_token` usar para validar el pago |
| Confirmación del pago | Webhook → re-consulta `GET /v1/payments/{id}` contra MP | No confiar en el payload del webhook (FR-007); idempotente por `mp_payment_id` |
| Auto-cancelación + recordatorio | Nuevo route `GET /api/cron/deposits` (Bearer `CRON_SECRET`) | Mismo patrón y scheduler (GitHub Actions) que `cron/reminders` |
| Cálculo del monto de seña | Helper puro server-side `computeDepositAmount(price, percent, min)` | Testeable sin DB; nunca se acepta monto del cliente |
| Estética de los estados de seña | Badges reusando tokens gold/success/danger existentes | Constitución: paleta restringida, sin ornamentos |

## File-Level Changes

### New Files

- `src/lib/mercadopago/client.ts` (MODIFICADO, ver abajo) — sumar `createDepositPreference()` y `getPayment()`.
- `src/lib/mercadopago/deposit.ts` — helper puro `computeDepositAmount({ servicePrice, depositPercent, depositMinAmount })` + tipos; usado por el route de booking y testeable aislado.
- `src/app/api/appointments/book/route.ts` — `POST`: crea la reserva con seña server-side (insert + preference + persistencia) y devuelve `{ appointmentId, token, initPoint, depositAmount }` o error claro (FR-001, FR-002, FR-003, FR-012).
- `src/app/api/mp/webhook/route.ts` — `POST`: recibe notificación de MP, resuelve barbería por `?bs=`, valida el pago contra MP, confirma el turno de forma idempotente, registra `payment_events` (FR-005, FR-006, FR-007, FR-011, FR-103).
- `src/app/api/cron/deposits/route.ts` — `GET` (Bearer `CRON_SECRET`): auto-cancela señas vencidas y manda recordatorio de pago antes del vencimiento (FR-008, FR-013).
- `src/components/DepositPaymentPanel.tsx` — panel reusable con monto de seña + botón "Pagar seña" (link a `init_point`) + estado; usado en el éxito del booking y en `/r/[token]`.
- `specs/003-mp-deposit-checkout/contracts/` — contratos de los 3 endpoints (doc).

### Modified Files

- `src/lib/mercadopago/client.ts` — agregar `createDepositPreference(accessToken, params)` (POST `/checkout/preferences`) y `getPayment(accessToken, paymentId)` (GET `/v1/payments/{id}`), con el mismo manejo de errores que `testMPConnection`.
- `src/components/BookingForm.tsx` — cuando `barbershop.mpEnabled`: en vez del insert anónimo + WhatsApp como cierre, llamar a `POST /api/appointments/book`, y al volver mostrar el `DepositPaymentPanel` (paso de pago reemplaza al cierre por WhatsApp — FR-004, FR-004b). Si `mp_enabled=false`, flujo intacto (FR-010).
- `src/lib/barbershops.ts` — mapear `mp_enabled`, `deposit_percent`, `deposit_min_amount`, `deposit_auto_cancel_hours` al objeto de barbería que consume el front (hoy el front no los recibe). NO exponer `mp_access_token` al cliente.
- `src/lib/supabase.ts` + `src/data/demo-barbershops.ts` — sumar los campos de seña (públicos, sin token) al tipo de barbería que usa la UI.
- `src/app/r/[token]/AppointmentActionPanel.tsx` (y/o la page) — mostrar estado de seña (pendiente/pagada/expirada) y, si está pendiente y no venció, el `DepositPaymentPanel` para pagar/reintentar; manejar back_urls de retorno (éxito/pendiente/rechazo) — FR-101.
- `src/app/api/appointments/[token]/route.ts` (o el endpoint que lee el turno público) — incluir `deposit_status`, `deposit_amount`, `deposit_expires_at`, `mp_preference_id`/`init_point` para reconstruir el botón de pago.
- `src/components/admin/AppointmentRow.tsx` — badge de estado de seña en el turnero (pendiente de pago / seña pagada / expirada) — FR-009, FR-102.
- `src/lib/whatsapp.ts` — (opcional) template de recordatorio de pago de seña con el link.
- `.github/workflows/*.yml` — sumar el trigger del nuevo cron `cron/deposits` al schedule existente (mismo `CRON_SECRET`).

### Deleted Files

Ninguno.

## Data Model Changes

**Ninguna migración nueva.** Todo el esquema ya existe en `20260607210000_mercadopago_deposits.sql`. Esta feature solo **escribe/lee** esas columnas:

- `appointments.deposit_required` → `true` cuando el turno se creó con seña.
- `appointments.deposit_amount` → monto calculado (int ARS).
- `appointments.deposit_status` → `pending` → `paid` | `expired` (| `failed` en rechazo persistente).
- `appointments.deposit_paid_at`, `deposit_expires_at`, `mp_payment_id`, `mp_preference_id`.
- `payment_events` → un row por evento (`preference_created`, `webhook_received`, `payment_approved`, `payment_rejected`, `auto_expired`).

Índices y RLS ya creados. `payment_events` solo se inserta con `service_role` (webhook/cron), nunca desde el cliente.

## API Surface

### New Endpoints

- `POST /api/appointments/book` — Crea reserva con seña. Payload: datos del turno (slug, barberId, serviceId/serviceName+price+duration, cliente, fecha, hora, comentario). El server **recalcula** el monto de seña (no acepta monto del cliente), inserta el turno `pending`, crea la preference, persiste `mp_preference_id`/`deposit_amount`/`deposit_status='pending'`/`deposit_expires_at`/`deposit_required=true`. Respuesta: `{ ok, appointmentId, token, initPoint, depositAmount }` o `{ error }` (400/409 slot ocupado/500). Solo para barberías `mp_enabled`.
- `POST /api/mp/webhook?bs=<slug>` — Recibe notificación de MP (`type=payment`). Resuelve `access_token` por slug, `GET /v1/payments/{data.id}`, lee `external_reference` (=appointmentId). Si aprobado y turno aún `pending`: marca `paid` + `confirmed` + `payment_approved`. Idempotente por `mp_payment_id`/`deposit_status`. Si el turno ya expiró/cancelado: registra evento y NO reconfirma (FR-103). Siempre responde 200 a MP salvo error real de proceso.
- `GET /api/cron/deposits` — (Bearer `CRON_SECRET`) 1) `deposit_status='pending'` con `deposit_expires_at < now` → `cancelled` + `expired` + `auto_expired`. 2) `deposit_status='pending'` próximos a vencer y sin recordatorio previo → enviar recordatorio (push/WhatsApp) y loggear.

### Modified Endpoints

- Endpoint público de lectura del turno por token — agregar campos de seña + `init_point` para reconstruir el botón de pago en `/r/[token]`.

## UI / UX

### Component Hierarchy

```
BookingForm (modificado)
└── DepositPaymentPanel (nuevo) — paso de pago tras reservar (si mp_enabled)
        ├── monto de seña
        └── botón "Pagar seña" → init_point (MP checkout)

/r/[token] page
└── AppointmentActionPanel (modificado)
        ├── badge estado de seña
        └── DepositPaymentPanel (si pendiente y no vencida)

AppointmentRow (admin, modificado)
└── badge estado de seña (pendiente / pagada / expirada)
```

### Key Interactions

- Reservar con seña → ve resumen + monto + botón "Pagar seña" (no redirección automática) → click abre checkout MP → al volver, `/r/[token]` muestra estado.
- Pago aprobado (webhook) → turno confirmado; cliente y barbero ven "seña pagada".
- No paga en plazo → cron cancela; horario liberado; estado "expirada".
- Antes de vencer → recordatorio con el link de pago.

## Testing Strategy

- **Build verification**: `npm run lint` + `npm run build` limpios.
- **Unit**: `computeDepositAmount` (porcentaje, mínimo, redondeo, precio 0) sin DB.
- **Manual smoke (sandbox MP)**:
  1. Reserva con seña → se ve monto correcto + botón → checkout MP TEST.
  2. Pago con tarjeta de prueba aprobada → webhook → turno confirmado + "seña pagada" (< 1 min).
  3. No pagar → tras `deposit_auto_cancel_hours` (probar con valor chico + `?force`) → turno cancelado + slot libre + "expirada".
  4. Barbería sin seña → flujo idéntico al actual (sin pago).
  5. Webhook duplicado (reenviar) → sin doble confirmación.
- **Edge cases a verificar**: token inválido (error claro, FR-012); pago tardío sobre turno expirado (no reconfirma, FR-103); seña por debajo del mínimo (cobra mínimo).

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Exponer `access_token` al cliente | Todo el uso del token es server-side; el front solo recibe `init_point` |
| Doble confirmación por webhook repetido | Idempotencia por `mp_payment_id` + chequeo de `deposit_status` antes de actualizar |
| Confiar en payload falso del webhook | Re-consultar `GET /v1/payments/{id}` contra MP antes de confirmar |
| Pago aprobado tras expirar (slot ya reocupado) | No reconfirmar; registrar `payment_events` para resolución/reembolso manual |
| Turno `pending` impago bloqueando slots | Auto-cancelación por cron al vencer el plazo configurable |
| Insert OK pero preference falla | Devolver error claro; el turno igual expira solo; loggear en Sentry |
| Cron no scheduleado (señas nunca expiran) | Sumar trigger al workflow de GitHub Actions junto con reminders |

## Rollback Plan

- Feature aislada en branch `003-mp-deposit-checkout`; no se mergea a `main` hasta QA en sandbox verde.
- Sin migración nueva → rollback = revertir el merge commit; el esquema de seña queda inerte (ninguna barbería pierde datos).
- "Kill switch" natural: con `mp_enabled=false` en una barbería, todo el flujo de seña queda inactivo y la reserva funciona como antes.

## Next Steps

- Run **speckit-tasks** para descomponer este plan en tareas ordenadas por dependencia.
