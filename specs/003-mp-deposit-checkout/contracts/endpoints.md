# API Contracts: Cobro de seña con MercadoPago

**Feature**: 003-mp-deposit-checkout

## POST /api/appointments/book

Crea una reserva con seña (solo barberías `mp_enabled=true`). Server-side, `service_role`.

**Request body**
```json
{
  "barbershopSlug": "sv-barber",
  "barberId": "uuid",
  "serviceId": "uuid",
  "customerName": "Juan Perez",
  "customerPhone": "+54 9 11 ...",
  "customerEmail": "opcional@mail.com",
  "appointmentDate": "2026-06-25",
  "appointmentTime": "17:30",
  "comment": ""
}
```

**Server behavior**
1. Valida que la barbería exista y tenga `mp_enabled=true` (si no, 400 — esta ruta es solo para seña).
2. Resuelve servicio (precio + duración) **desde la DB** (no del cliente).
3. Calcula `depositAmount = max(round(price*percent/100), minAmount)`.
4. Inserta turno `status='pending'`, `deposit_required=true`, `deposit_status='pending'`, `deposit_amount`, `deposit_expires_at=now+autoCancelHours`.
5. Crea preference MP; guarda `mp_preference_id`; registra `payment_events('preference_created')`.

**Responses**
- `200` `{ "ok": true, "appointmentId": "uuid", "token": "...", "initPoint": "https://...", "depositAmount": 2550 }`
- `409` `{ "error": "Ese horario ya está ocupado." }` (índice único)
- `400` `{ "error": "..." }` (datos inválidos / barbería sin seña)
- `502` `{ "error": "No pudimos generar el pago. Probá de nuevo." }` (falla preference; turno queda pendiente y expira solo)

## POST /api/mp/webhook?bs=<slug>

Notificación de MercadoPago.

**Query**: `bs` = barbershopSlug (para resolver el `access_token`).
**Body (MP)**: `{ "type": "payment", "data": { "id": "<paymentId>" } }` (también puede venir como `topic`/query params).

**Server behavior**
1. Resuelve `access_token` por `bs`. Si no hay → 200 (ignora, sin filtrar info).
2. `GET /v1/payments/{data.id}` con el token. Lee `status` + `external_reference` (=appointmentId).
3. Registra `payment_events('webhook_received', raw_payload)`.
4. Si `approved` y turno `pending`/`deposit_status='pending'`:
   - `status='confirmed'`, `deposit_status='paid'`, `deposit_paid_at=now`, `mp_payment_id`.
   - `payment_events('payment_approved')`.
5. Si `rejected` → `payment_events('payment_rejected')` (turno sigue pendiente, puede reintentar).
6. Si turno ya `cancelled`/`expired` y pago `approved` → NO reconfirmar; `payment_events('payment_approved')` + marca para revisión manual (FR-103).
7. Idempotente: si `mp_payment_id` ya seteado o `deposit_status!='pending'` → no-op.

**Responses**: `200` siempre que el proceso no falle (MP reintenta ante no-2xx). `500` solo en error interno real.

## GET /api/cron/deposits

Auto-cancelación + recordatorio. `Authorization: Bearer <CRON_SECRET>`. `?force=true` para testing.

**Server behavior**
- **Expirar**: `deposit_status='pending'` AND `deposit_expires_at < now()` → `status='cancelled'`, `deposit_status='expired'`, `cancellation_reason='seña no pagada a tiempo'`, `payment_events('auto_expired')`.
- **Recordar**: `deposit_status='pending'` AND por vencer (ventana, p.ej. 3h antes) AND sin `reminder_log(kind='deposit_reminder')` → enviar push/WhatsApp con el link de pago + loggear.

**Responses**: `200` `{ "ok": true, "expired": N, "reminded": M }` · `401` sin secret.

## Endpoint público de lectura del turno (modificado)

El endpoint que sirve `/r/[token]` agrega al payload: `deposit_status`, `deposit_amount`, `deposit_expires_at`, `init_point` (reconstruido desde `mp_preference_id` o guardado), para poder mostrar el botón "Pagar seña" / estado.
