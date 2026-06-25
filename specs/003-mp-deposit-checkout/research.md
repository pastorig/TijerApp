# Research: Cobro de seña con MercadoPago

**Feature**: 003-mp-deposit-checkout · **Created**: 2026-06-21

## R1 — ¿Cómo se retiene el horario durante el pago?

- **Decisión**: Reusar `status='pending'`. El índice único parcial `appointments_unique_active_slot` (migración `20260526120000`) ya impide dos turnos `pending`/`confirmed` en el mismo slot.
- **Rationale**: La retención es automática; no hay estado nuevo. Pagar = `confirmed`; expirar = `cancelled` (libera el slot porque sale del índice parcial).
- **Alternativas**: (a) estado "held" nuevo → duplica lógica de double-booking ya resuelta; (b) no retener hasta pagar → riesgo de doble reserva (descartado en clarify).

## R2 — Manejo del access_token (secreto por barbería)

- **Decisión**: Todo uso del `mp_access_token` ocurre en route handlers server-side con `service_role`. El cliente nunca lo ve; solo recibe `init_point`.
- **Rationale**: Es un secreto de cobro. Hoy la reserva sin seña se hace con insert anónimo (RLS permite insert público de `appointments`), pero crear la preference requiere el token → obliga a server-side.
- **Alternativas**: Public key en el front + Brick de pago → más complejo, igual necesita server para validar; se descarta para el MVP.

## R3 — Crear la preference de checkout

- **Decisión**: `POST https://api.mercadopago.com/checkout/preferences` con `Authorization: Bearer <access_token de la barbería>`, `fetch` nativo (patrón existente).
- **Campos clave**:
  - `items`: `[{ title, quantity: 1, unit_price: depositAmount, currency_id: "ARS" }]`
  - `external_reference`: `appointmentId` (clave para reconciliar en el webhook)
  - `notification_url`: `{SITE_URL}/api/mp/webhook?bs=<slug>` (el `?bs` permite resolver el token en el webhook)
  - `back_urls`: success/failure/pending → `{SITE_URL}/r/{token}`
  - `auto_return: "approved"`
  - `expires: true`, `expiration_date_to: deposit_expires_at` (ISO) → MP también vence el link
- **Respuesta**: `{ id, init_point, sandbox_init_point }`. Con credenciales TEST, `init_point` ya apunta al checkout de prueba → usamos `init_point` siempre.
- **Rationale**: `external_reference` + `?bs` cubren la reconciliación sin guardar un mapa aparte.

## R4 — Validación del pago (webhook)

- **Decisión**: El webhook recibe `type=payment` + `data.id`. Resuelve `access_token` por `?bs`, hace `GET /v1/payments/{data.id}` y lee `status` (`approved`) y `external_reference`.
- **Rationale**: FR-007 — no confiar en el payload; la fuente de verdad es la API de MP. MP puede mandar `topic=merchant_order` también; para el MVP procesamos `payment`.
- **Idempotencia**: Antes de actualizar, chequear que el turno siga `pending`/`deposit_status='pending'` y que `mp_payment_id` no esté ya seteado. Reentradas → no-op + `payment_events` (`webhook_received`).
- **Respuesta a MP**: 200 salvo error real de proceso (MP reintenta ante no-2xx).

## R5 — Auto-cancelación + recordatorio (cron)

- **Decisión**: Nuevo `GET /api/cron/deposits` autenticado por `Bearer CRON_SECRET`, scheduleado por GitHub Actions (igual que `cron/reminders`; no hay `vercel.json`).
- **Lógica**: (1) `deposit_status='pending'` con `deposit_expires_at < now()` → `cancelled` + `expired` + `payment_events('auto_expired')`. (2) Próximos a vencer sin recordatorio previo → enviar (reusar canal push/WhatsApp del cron de reminders + `reminder_log` con kind nuevo `deposit_reminder`).
- **Rationale**: Reusa infra de cron/secret/canales existente. `?force=true` para testear sin esperar.

## R6 — Credenciales TEST de MercadoPago

- **Decisión**: Probar primero con Access Token/Public Key de **TEST** del vendedor + tarjetas de prueba de MP (APRO = aprobada, OTHE = rechazada).
- **Rationale**: Cero riesgo de plata real. La URL pública del webhook es el deploy de Vercel (no requiere dominio).
- **Nota operativa (Bautista)**: cargar las credenciales TEST en el panel de cobros de la barbería de prueba; el webhook necesita que la app esté deployada (URL pública).

## Resumen de decisiones

| # | Tema | Decisión |
|---|---|---|
| R1 | Retención de horario | Reusar `status='pending'` + índice único |
| R2 | Secreto | Token solo server-side; cliente recibe `init_point` |
| R3 | Preference | `fetch` a `/checkout/preferences`, `external_reference`+`?bs` |
| R4 | Validación | `GET /v1/payments/{id}`, idempotente por `mp_payment_id` |
| R5 | Cron | `/api/cron/deposits` con `CRON_SECRET`, GitHub Actions |
| R6 | Pruebas | Credenciales TEST + tarjetas de prueba, webhook en Vercel |

Sin `NEEDS CLARIFICATION` pendientes.
