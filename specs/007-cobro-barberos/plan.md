# Implementation Plan: Cobro de barberos — Fase 1 (transferencia + activación manual)

**Branch**: `007-cobro-barberos`
**Spec**: spec.md
**Created**: 2026-07-07
**Status**: Draft

## Architecture Overview

Feature **aditiva** sobre el sistema de planes ya existente. Hoy `barbershop_subscriptions` maneja el estado del plan vía `status` + `trial_expires_at`/`grace_expires_at`, y `resolvePlanStatus()` (función pura) deriva el `effectiveStatus`. Sumamos una segunda "fuente de verdad" de vigencia: **`pagado_hasta`**, que cuando está seteada **precede** a la lógica de trial (una barbería paga está activa mientras `pagado_hasta` esté en el futuro; al pasar, entra en gracia y luego vence, igual que el trial). Filas sin `pagado_hasta` se comportan exactamente como hoy → cero regresión.

El **founder** registra pagos manualmente desde `/owner/planes` (extendemos `OwnerPlansManager`): un endpoint owner-auth inserta el pago en una tabla nueva `barbershop_payments` (historial/auditoría) y, en la misma operación, extiende `pagado_hasta += 1 mes` desde `max(hoy, pagado_hasta)` y pone `status='active'`. El **barbero** con plan vencido ve en el paywall/banner el monto (precio de su tier, de `PLAN_META`) + los datos de transferencia de Gino, además del WhatsApp que ya existe.

Toda integración de pago automático (MercadoPago) queda **fuera de alcance** — esta fase es transferencia manual + registro + activación.

## Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Vigencia del plan | Nueva columna `pagado_hasta timestamptz null` en `barbershop_subscriptions` | Aditivo; `null` = comportamiento legacy (trial). Precede al trial cuando está seteada. |
| Lógica de estado | Extender `resolvePlanStatus()` (pura) con `pagadoHasta` + `GRACE_DAYS` derivado | Ya es pura y testeable; un solo lugar decide el estado. Sin cambiar el path de trial. |
| Historial de pagos | Tabla nueva `barbershop_payments` (append-only) | Auditoría (quién/cuánto/hasta cuándo); base para MP en fase futura. |
| Registro de pago | Endpoint owner-auth `POST /api/owner/register-payment` | Mismo patrón que `api/owner/plans`, `reset-barbershop-admin` (valida access_token del owner, usa admin client). |
| UI de cobros | Extender `/owner/planes` (`OwnerPlansManager`) | DRY: ya lista barberías con tier/estado + auth owner; evita duplicar scaffolding. (Alternativa considerada: página nueva `/owner/cobros` — se difiere hasta que crezca con MP.) |
| Datos de transferencia de Gino | Constante de config del founder en `src/lib/founder.ts` (alias/CBU/titular + WhatsApp) | Centraliza el contacto/cobro del founder; hoy el número está duplicado en 4 archivos → se unifica. |
| Monto mostrado | `PLAN_META[tier].priceArs` del tier vigente de la barbería | Decidido en spec (opción A). Cada barbería ve su precio. |
| Fechas / meses | Helper puro `addMonths` + `computeNextPaidUntil(now, current)` en `src/lib/plans.ts` | Testeable sin DB; evita edge cases de fin de mes. |

## File-Level Changes

### New Files

- `supabase/migrations/20260707120000_barber_billing.sql` — columna `pagado_hasta` + tabla `barbershop_payments` + RLS + índices.
- `src/lib/founder.ts` — config del founder: `FOUNDER = { whatsapp, alias, cbu, titular }` + helper `founderWaLink(message)`. Reemplaza los hardcodes dispersos.
- `src/components/owner/RegisterPaymentDialog.tsx` — modal para registrar un pago (monto prefill por tier, método, fecha, nota) desde `/owner/planes`.
- `src/lib/owner-payments.ts` — client-side fetch helper `registerBarbershopPayment(...)` + tipo del pago (para el dialog y el listado).

### Modified Files

- `src/lib/plans.ts` — `resolvePlanStatus()` acepta `pagadoHasta: Date|null` y lo evalúa con precedencia sobre el trial (active / grace / expired); `ResolvedPlan` gana `paidUntil: Date|null` + `daysToPaidExpire: number|null`; agrego `GRACE_DAYS`, `addMonths()`, `computeNextPaidUntil()`.
- `src/lib/plan-access.ts` — `getBarbershopPlan()` lee `pagado_hasta` de la fila y lo pasa a `resolvePlanStatus`; el default seguro (sin fila) queda igual.
- `src/components/admin/PlanContext.tsx` — `SerializedPlan` + provider serializan `paidUntil`/`daysToPaidExpire` (Date → ISO) para cruzar server→client.
- `src/components/admin/PlanStatusBanner.tsx` — muestra monto (tier) + datos de transferencia (de `founder.ts`) además del WhatsApp; usa `founderWaLink`.
- `src/components/admin/RequirePlan.tsx` — `ExpiredPaywall` muestra monto + alias/CBU/titular (de `founder.ts`); usa `founderWaLink`. (También `HomeContact`/`CommercialFooter` pueden migrar a `founder.ts`, opcional.)
- `src/components/owner/OwnerPlansManager.tsx` — por barbería: mostrar `pagado_hasta` + estado, botón "Registrar pago" (abre `RegisterPaymentDialog`), y un mini-historial de últimos pagos.
- `src/lib/owner-metrics.ts` (o el loader que use OwnerPlansManager) — incluir `pagado_hasta` y últimos pagos en el summary por barbería (o un fetch aparte en el dialog).

### API

- `src/app/api/owner/register-payment/route.ts` (**nuevo**) — `POST`, owner-auth.

## Data Model Changes

### New Tables / Columns

```sql
alter table public.barbershop_subscriptions
  add column if not exists pagado_hasta timestamptz null;

create table if not exists public.barbershop_payments (
  id uuid primary key default gen_random_uuid(),
  barbershop_slug text not null,
  amount numeric(12,2) not null check (amount >= 0),
  method text not null,                      -- 'transferencia' | 'efectivo' | 'otro'
  period_start timestamptz not null,         -- desde (max(now, pagado_hasta previo))
  period_end timestamptz not null,           -- pagado_hasta resultante
  note text null,
  registered_by text null,                   -- email/id del owner que lo registró
  created_at timestamptz not null default now()
);
create index if not exists barbershop_payments_slug_idx
  on public.barbershop_payments (barbershop_slug, created_at desc);
```

### RLS Policies

- `barbershop_payments`: RLS **on**. Sin políticas públicas → solo el **service_role** (admin client, usado por el endpoint owner-auth) puede leer/escribir. Los barberos NUNCA acceden a esta tabla. (Mismo criterio que otras tablas owner-only.)
- `pagado_hasta` en `barbershop_subscriptions`: hereda las policies existentes de esa tabla (ya restringida); el update lo hace el service_role vía endpoint owner.

### Indexes

- `barbershop_payments_slug_idx (barbershop_slug, created_at desc)` — historial por barbería, orden reciente.

## API Surface

### New Endpoints

- `POST /api/owner/register-payment` — **owner-auth** (Bearer access_token del owner, validado como en `api/owner/plans`).
  - **Payload**: `{ slug: string, amount: number, method: string, paidAt?: string (ISO), note?: string }`.
  - **Lógica**: valida owner; lee `pagado_hasta` actual de la sub; `periodStart = max(now, pagado_hasta ?? now)`; `periodEnd = addMonths(periodStart, 1)`; inserta en `barbershop_payments`; update `barbershop_subscriptions` set `pagado_hasta = periodEnd, status='active'`. Todo o nada (si falla el update, no dejar el pago huérfano — insertar pago y update en secuencia con manejo de error; idealmente una RPC `security definer` transaccional — ver research).
  - **Response**: `{ ok: true, pagadoHasta: ISO, payment: {...} }` o `{ error }` con status 4xx/5xx.

(Opcional GET historial: se puede resolver con el loader de OwnerPlansManager; no hace falta endpoint nuevo si el summary ya trae los pagos.)

## UI / UX

### Component Hierarchy

```
/owner/planes (OwnerPlansManager)          [modificado]
└── (por barbería) fila/card
    ├── estado de plan + "Pagado hasta: 20/08"   [nuevo]
    ├── botón "Registrar pago"                    [nuevo]
    │   └── RegisterPaymentDialog                 [nuevo]
    └── mini-historial últimos pagos              [nuevo]

/[slug]/admin/*  (barbero con plan vencido/por vencer)
├── PlanStatusBanner   [modificado: monto + transferencia]
└── RequirePlan → ExpiredPaywall  [modificado: monto + alias/CBU/titular + WhatsApp]
```

### Key Interactions

- **Founder registra pago**: click "Registrar pago" → dialog con monto (prefill `PLAN_META[tier].priceArs`, editable), método (transferencia default), fecha (hoy default), nota → confirmar → POST → la barbería pasa a activa, `pagado_hasta` +1 mes, aparece en el historial. Feedback claro (toast/estado).
- **Barbero vencido**: entra al admin → banner/paywall muestra "Tu plan venció. Son $X/mes. Transferí a: Alias pastorinx · Gino Pastori · CBU ... y avisá por WhatsApp". Botón WhatsApp a Gino (ya existe). Copiar alias/CBU (nice-to-have).

## Testing Strategy

- **Build verification**: `tsc --noEmit`, `npm run lint`, `npm run build` limpios.
- **Lógica pura (prioridad)**: `resolvePlanStatus` con `pagadoHasta` (futuro→active, pasado dentro de gracia→grace, pasado fuera→expired, null→legacy trial intacto); `addMonths`/`computeNextPaidUntil` (fin de mes: 31/01 +1 = 28/02; retroactivo usa max). Como el repo no tiene runner Vitest activo, escribir estas funciones puras y verificarlas con un script `node --env-file` ad-hoc o asserts temporales; documentar en quickstart.
- **Manual smoke** (contra Neon/Supabase de prueba): (1) registrar pago a barbería vencida → queda activa + pagado_hasta correcto; (2) segundo pago suma bien (max); (3) barbero vencido ve monto + datos; (4) trial sin pagado_hasta sigue igual.
- **Edge cases del spec**: trial vigente sin pago; pago retroactivo; pago durante trial; doble registro (suma + visible en historial); cambio de tier (monto refleja tier).

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Romper el path de trial existente | `pagado_hasta` es precedente SOLO si `!= null`; filas viejas (null) siguen por el branch de trial idéntico. Tests de `resolvePlanStatus` cubren ambos. |
| Pago insertado pero update de `pagado_hasta` falla (inconsistencia) | Usar RPC `security definer` transaccional para insert+update atómico (preferido), o manejar el error y no confirmar al owner si el update no cerró. |
| Exponer datos de cobro/pagos a barberos | `barbershop_payments` sin policies públicas (solo service_role); la UI de pagos vive solo en `/owner/*` con owner-auth. |
| Alias/CBU hardcodeado y disperso | Centralizar en `src/lib/founder.ts`; un solo lugar para actualizar. |
| Fin de mes en `addMonths` | Helper puro con test explícito (clamp a último día del mes destino). |

## Rollback Plan

- Revertir el/los commits del branch (no se mergea a `main` hasta verde). Merge final `--no-ff`.
- Migración: es aditiva (add column + create table). Rollback = `drop table barbershop_payments; alter table barbershop_subscriptions drop column pagado_hasta;` (down opcional). Con `pagado_hasta` en null, el sistema vuelve al comportamiento previo aunque quede la columna.
- Sin feature flag: es aditivo e inerte hasta que se registra el primer pago.

## Constitution Check

- ✅ Multi-tenant: todo por `barbershop_slug` + RLS owner-only. No hardcodea SV Barber.
- ✅ Mobile-first: dialog y paywall responsive (min-h-11, formularios compactos).
- ✅ Estética premium minimal: reusa componentes/tokens existentes (owner + admin).
- ✅ Español rioplatense.
- ✅ Stack discipline: TS, App Router, Tailwind, Supabase RLS. **Sin libs nuevas.**
- ✅ No half-finished: DB→API→UI→verificación end-to-end.
- ✅ Branch workflow: `007-cobro-barberos`, merge `--no-ff`, no push directo a `main`.
- **Sin violations.**

## Next Steps

- Run **speckit-tasks** para descomponer esto en una lista de tareas ordenada por dependencias.
