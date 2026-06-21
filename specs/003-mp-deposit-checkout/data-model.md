# Data Model: Cobro de seña con MercadoPago

**Feature**: 003-mp-deposit-checkout · **Created**: 2026-06-21

> Todo el esquema YA existe (migración `20260607210000_mercadopago_deposits.sql`). Este doc describe cómo lo usa la feature. **No hay migración nueva.**

## appointments (columnas de seña)

| Campo | Tipo | Uso en esta feature |
|---|---|---|
| `deposit_required` | boolean | `true` si el turno se creó con seña |
| `deposit_amount` | int (ARS) | Monto calculado server-side (porcentaje o mínimo) |
| `deposit_status` | text | `null` (sin seña) · `pending` · `paid` · `expired` · `failed` |
| `deposit_paid_at` | timestamptz | Seteado al confirmar el pago |
| `deposit_expires_at` | timestamptz | `created + deposit_auto_cancel_hours`; vencimiento del pago |
| `mp_payment_id` | text | ID del pago aprobado (idempotencia) |
| `mp_preference_id` | text | ID de la preference creada |
| `status` | enum | `pending` (retiene slot) → `confirmed` (pagó) / `cancelled` (expiró) |

### Transiciones de estado (turno con seña)

```
[crear reserva, mp_enabled]
        │
        ▼
status=pending, deposit_status=pending, deposit_expires_at=T
        │
        ├── pago aprobado (webhook)  → status=confirmed, deposit_status=paid, deposit_paid_at, mp_payment_id
        │
        └── vence T sin pago (cron)  → status=cancelled, deposit_status=expired  (slot liberado)

pago aprobado DESPUÉS de expirar → NO reconfirmar; payment_events + revisión manual (FR-103)
```

### Reglas de cálculo del monto (helper puro)

```
depositByPercent = round(servicePrice * depositPercent / 100)
depositAmount    = max(depositByPercent, depositMinAmount ?? 0)
```

- `depositPercent` ∈ [1,100], `depositMinAmount` int > 0 o null (constraints ya en DB).
- Redondeo a entero ARS (MP ARS no usa centavos en la práctica del MVP).

## barbershops (config de cobro — ya existente)

| Campo | Tipo | Uso |
|---|---|---|
| `mp_enabled` | boolean | Gate del flujo de seña |
| `mp_access_token` | text | **Secreto, solo server-side** |
| `mp_public_key` | text | Disponible para el front si más adelante se usa Brick |
| `deposit_percent` | int 1–100 | % de seña |
| `deposit_min_amount` | int \| null | Mínimo de seña |
| `deposit_auto_cancel_hours` | int 1–168 | Plazo de pago → `deposit_expires_at` |

> El mapper público de barbería (`src/lib/barbershops.ts`) expone `mp_enabled`, `deposit_percent`, `deposit_min_amount`, `deposit_auto_cancel_hours`. **Nunca** `mp_access_token`.

## payment_events (auditoría — ya existente)

| Campo | Uso |
|---|---|
| `appointment_id` | FK al turno (cascade) |
| `event_type` | `preference_created` · `webhook_received` · `payment_approved` · `payment_rejected` · `payment_pending` · `auto_expired` · `manual_refund` |
| `amount`, `mp_payment_id`, `mp_preference_id` | Datos del evento |
| `raw_payload` | jsonb del webhook/respuesta MP (debug) |
| `created_at` | timestamp |

- Inserts solo con `service_role`. RLS: admin lee solo eventos de su barbería.

## reminder_log (reuso para recordatorio de pago)

- Nuevo `kind = 'deposit_reminder'` (mismo patrón que `reminder_24h`) para no mandar el recordatorio de pago más de una vez por turno.
