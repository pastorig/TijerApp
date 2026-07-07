# Data Model: Cobro de barberos — Fase 1

## `barbershop_subscriptions` (existente — se agrega 1 columna)

| Campo | Tipo | Notas |
|---|---|---|
| ... (existentes) | | `plan_tier`, `status`, `trial_expires_at`, `grace_expires_at`, `barbershop_slug` |
| **`pagado_hasta`** | `timestamptz null` | **NUEVO**. Vigencia del plan por pago. `null` = comportamiento legacy (rige el trial). Cuando está seteada, precede al trial en `resolvePlanStatus`. |

Transiciones de estado (efectivas, computadas):
- `pagado_hasta > now` → **active**
- `now < pagado_hasta + GRACE_DAYS` → **grace**
- `pagado_hasta + GRACE_DAYS <= now` → **expired**
- `pagado_hasta = null` → lógica de trial/estado existente (sin cambios)
- `status = 'cancelled'` → **cancelled** (precede a todo)

## `barbershop_payments` (NUEVA — append-only, auditoría)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `uuid pk` | `default gen_random_uuid()` |
| `barbershop_slug` | `text not null` | Tenant. Indexado. |
| `amount` | `numeric(12,2) not null` | `check (amount >= 0)`. ARS. |
| `method` | `text not null` | `'transferencia'` \| `'efectivo'` \| `'otro'` (validado en el endpoint). |
| `period_start` | `timestamptz not null` | Desde cuándo cubre = `max(now, pagado_hasta previo)`. |
| `period_end` | `timestamptz not null` | Hasta cuándo cubre = `pagado_hasta` resultante. |
| `note` | `text null` | Nota opcional del owner. |
| `registered_by` | `text null` | Email/id del owner que lo registró. |
| `created_at` | `timestamptz not null` | `default now()`. |

- **Índice**: `(barbershop_slug, created_at desc)` — historial reciente por barbería.
- **RLS**: on, sin políticas públicas → solo `service_role` (endpoint owner-auth). Los barberos no acceden.
- **Relación**: N pagos → 1 barbería (por `barbershop_slug`). Append-only (no update/delete en Fase 1).

## RPC `register_barbershop_payment` (nueva, `security definer`)

Params: `p_slug, p_amount, p_method, p_period_start, p_period_end, p_note, p_registered_by`.
Efecto atómico: `insert` en `barbershop_payments` + `update barbershop_subscriptions set pagado_hasta = p_period_end, status='active' where barbershop_slug = p_slug`. Devuelve la fila del pago (o el `pagado_hasta` nuevo).
