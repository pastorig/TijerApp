# Tasks: Cobro de barberos — Fase 1 (transferencia + activación manual)

**Branch**: `007-cobro-barberos`
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)
**Created**: 2026-07-07
**Status**: Ready

## Conventions

- Cada task es **atómica** (1 archivo o 1 unidad lógica).
- **[BLOCKING]** = debe completarse antes de las dependientes.
- **[P]** = puede ir en paralelo con sus pares del mismo nivel.
- Cada task tiene **criterios de aceptación** explícitos.

## Dependency Graph

```
T001 [BLOCKING] ─┐
T002 [P] ────────┼─→ T004 ─→ T009 ─┐
T003 [P] ────────┘   T005 ─→ T010  ├─→ T012 → T013
                     T006 ─→ T007 ─→ T008 ─→ T009
                     T003 ─→ T010 / T011
```

## Tasks

### Phase 1: Foundation [BLOCKING]

#### T001 [BLOCKING]: Migración SQL — schema de cobros

- **Files**: `supabase/migrations/20260707120000_barber_billing.sql`
- **Description**: Columna `pagado_hasta timestamptz null` en `barbershop_subscriptions`; tabla `barbershop_payments` (ver data-model.md) con `check (amount >= 0)`; índice `(barbershop_slug, created_at desc)`; RLS **on** sin políticas públicas (solo service_role); RPC `security definer` `register_barbershop_payment(p_slug, p_amount, p_method, p_period_start, p_period_end, p_note, p_registered_by)` que hace insert + update atómico y devuelve la fila del pago.
- **Acceptance criteria**:
  - [ ] Migración aditiva (usa `if not exists`), no rompe datos existentes.
  - [ ] `barbershop_payments` con RLS on y sin policy pública.
  - [ ] RPC inserta el pago y setea `pagado_hasta` + `status='active'` en una transacción.
- **Dependencies**: None

#### T002 [P]: Dominio puro de vigencia en `plans.ts`

- **Files**: `src/lib/plans.ts`
- **Description**: Agregar `GRACE_DAYS`, `addMonths(date, n)` (clamp a fin de mes), `computeNextPaidUntil(now, current)` = `addMonths(max(now, current ?? now), 1)`. Extender `resolvePlanStatus` para aceptar `pagadoHasta: Date|null`: si `!= null` y `rawStatus != 'cancelled'` precede al trial (futuro→active; dentro de `pagadoHasta+GRACE_DAYS`→grace; sino→expired). Extender `ResolvedPlan` con `paidUntil: Date|null` + `daysToPaidExpire: number|null`. `pagadoHasta=null` → lógica de trial **idéntica** a hoy.
- **Acceptance criteria**:
  - [ ] Funciones puras (sin I/O), fáciles de testear.
  - [ ] `pagadoHasta=null` no cambia el comportamiento actual (no-regresión trial).
  - [ ] `addMonths(2026-01-31,1)` = `2026-02-28`.
  - [ ] Verificado con asserts ad-hoc (script `node` temporal) los 5 casos del quickstart.
- **Dependencies**: None

#### T003 [P]: Config del founder `founder.ts` + unificar usos

- **Files**: `src/lib/founder.ts` (nuevo); modificar `src/components/admin/PlanStatusBanner.tsx`, `src/components/admin/RequirePlan.tsx`, `src/components/home/HomeContact.tsx`, `src/components/home/CommercialFooter.tsx`
- **Description**: `FOUNDER = { whatsapp: "5493571624511", alias: "pastorinx", cbu: "4530000800016883827535", titular: "Gino Pastori" }` + `founderWaLink(message)`. Reemplazar los hardcodes actuales del número/WhatsApp por esta constante.
- **Acceptance criteria**:
  - [ ] Un solo lugar define los datos de cobro/contacto del founder.
  - [ ] Los 4 archivos usan `founder.ts` (sin números sueltos).
  - [ ] `tsc` + `lint` verdes.
- **Dependencies**: None

### Phase 2: Backend wiring

#### T004: `getBarbershopPlan` lee `pagado_hasta`

- **Files**: `src/lib/plan-access.ts`
- **Description**: Agregar `pagado_hasta` al `select` de `barbershop_subscriptions` y pasarlo (Date|null) a `resolvePlanStatus`. Mantener el default seguro (sin fila) igual.
- **Acceptance criteria**:
  - [ ] El plan resuelto refleja `pagado_hasta` cuando existe.
  - [ ] Barberías sin fila / sin `pagado_hasta` siguen igual.
- **Dependencies**: T001, T002

#### T005: Serializar `paidUntil` en `PlanContext`

- **Files**: `src/components/admin/PlanContext.tsx`
- **Description**: Agregar `paidUntilIso`/`daysToPaidExpire` a `SerializedPlan` y al provider (Date → ISO) para cruzar server→client, y exponerlos en el hook.
- **Acceptance criteria**:
  - [ ] El banner (client) puede leer la fecha/estado de pago.
  - [ ] `tsc` verde (tipos serializables).
- **Dependencies**: T002

#### T006: Endpoint `POST /api/owner/register-payment`

- **Files**: `src/app/api/owner/register-payment/route.ts` (nuevo)
- **Description**: Owner-auth (patrón `api/owner/plans`). Valida payload (slug, amount>=0, method en enum). Lee `pagado_hasta` actual; `periodStart=max(now, pagado_hasta ?? now)`, `periodEnd=addMonths(periodStart,1)`; llama RPC `register_barbershop_payment`. Errores en español (400/401/404/500). Ver contracts/register-payment.md.
- **Acceptance criteria**:
  - [ ] Sin token válido de owner → 401.
  - [ ] Registra el pago y devuelve `pagadoHasta` nuevo.
  - [ ] Segundo pago usa `max` (no desde hoy si ya estaba paga a futuro).
- **Dependencies**: T001, T002

#### T007 [P]: Helper client `owner-payments.ts`

- **Files**: `src/lib/owner-payments.ts` (nuevo)
- **Description**: `registerBarbershopPayment({slug, amount, method, paidAt, note})` (fetch con Bearer del owner) + tipos del pago y del historial para el dialog/listado.
- **Acceptance criteria**:
  - [ ] Tipado, maneja error y devuelve `{ok, pagadoHasta, payment}` o error.
- **Dependencies**: T006

### Phase 3: UI

#### T008: `RegisterPaymentDialog`

- **Files**: `src/components/owner/RegisterPaymentDialog.tsx` (nuevo)
- **Description**: Modal (patrón de los dialogs owner existentes): monto (prefill `PLAN_META[tier].priceArs`, editable), método (transferencia default), fecha (hoy), nota. Confirmar → `registerBarbershopPayment` → feedback + callback de refresh. Mobile-first, tokens de marca.
- **Acceptance criteria**:
  - [ ] Prefill del monto por tier; validación mínima.
  - [ ] Estados loading/error/success claros; se cierra y refresca al confirmar.
- **Dependencies**: T007

#### T009: Extender `OwnerPlansManager` (pagado_hasta + botón + historial)

- **Files**: `src/components/owner/OwnerPlansManager.tsx` (+ loader de datos que use, ej. `src/lib/owner-metrics.ts` si corresponde)
- **Description**: Por barbería: mostrar `pagado_hasta` + estado; botón "Registrar pago" (abre `RegisterPaymentDialog`); mini-historial de últimos pagos. Traer `pagado_hasta` + pagos en el loader owner.
- **Acceptance criteria**:
  - [ ] Se ve hasta cuándo está paga cada barbería.
  - [ ] Registrar un pago reactiva y refleja la nueva fecha sin recargar a mano.
  - [ ] Historial visible por barbería.
- **Dependencies**: T004, T008

#### T010 [P]: `PlanStatusBanner` con monto + transferencia

- **Files**: `src/components/admin/PlanStatusBanner.tsx`
- **Description**: Mostrar monto (precio del tier de la barbería, `PLAN_META`) + datos de transferencia de `founder.ts` (alias/CBU/titular), además del WhatsApp existente. Usar `paidUntil`/estado del `PlanContext`.
- **Acceptance criteria**:
  - [ ] En "por vencer"/gracia/vencido muestra monto + alias/CBU + WhatsApp.
  - [ ] Mobile-first; español rioplatense.
- **Dependencies**: T003, T005

#### T011 [P]: `RequirePlan` ExpiredPaywall con monto + transferencia

- **Files**: `src/components/admin/RequirePlan.tsx`
- **Description**: `ExpiredPaywall` muestra monto (tier) + Alias `pastorinx` · Gino Pastori · CBU (de `founder.ts`) + botón WhatsApp. (Copiar alias/CBU: nice-to-have.)
- **Acceptance criteria**:
  - [ ] El barbero vencido ve cuánto y a dónde transferir sin preguntar.
- **Dependencies**: T003

### Phase 4: Polish & Verification

#### T012: Verificación tsc + lint + build

- **Files**: —
- **Description**: `npx tsc --noEmit`, `npm run lint`, `npm run build` — todo limpio (parar el dev server / `rm -rf .next` si hace falta).
- **Acceptance criteria**:
  - [ ] tsc 0 errores; lint 0 errores/warnings; build success.
- **Dependencies**: T009, T010, T011

#### T013: Smoke test end-to-end

- **Files**: —
- **Description**: Aplicar migración (MCP Supabase / SQL Editor) y correr los 4 smoke del quickstart (registrar pago a vencida → activa; segundo pago suma con max; barbero vencido ve monto+datos; trial sin pago intacto).
- **Acceptance criteria**:
  - [ ] Los 4 caminos del quickstart pasan.
  - [ ] Escenarios de aceptación del spec verificados.
- **Dependencies**: T012

## Completion Criteria

- Todas las tasks ✅
- Lint + build limpios
- Smoke tests pasan
- Escenarios de aceptación del spec verificados

## MVP / Estrategia

- **Núcleo mínimo demostrable**: T001 + T002 + T004 + T006 + T009 (registrar pago reactiva una barbería). El paywall con monto/transferencia (T003/T010/T011) es la otra mitad de valor; van juntas para el "end-to-end" de la constitución.
- Paralelizables: T002 y T003 (con T001); T007 tras T006; T010/T011 tras T003/T005.

## Next Steps

- Run **speckit-analyze** (opcional) para chequear consistencia cross-artefacto.
- Run **speckit-implement** para ejecutar estas tasks.
