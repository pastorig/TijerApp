# Activación desde crmsaas — Plan de implementación (TijerApp)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que crmsaas pueda registrar el pago de una barbería y activarla hasta la fecha pagada con `POST /api/crm/activate`.

**Architecture:**
- Ruta Next autenticada con un token propio (`CRM_ACTIVATE_TOKEN`).
- Validación pura en `src/lib/crm-activate.ts`.
- La escritura va en una RPC nueva de Postgres (`crm_activate_barbershop`), atómica e idempotente por `command_id`.
- No se toca `register_barbershop_payment` ni cómo se resuelve el acceso: `resolvePlanStatus` ya bloquea por `current_period_ends_at` con 7 días de gracia.

**Tech Stack:**
- Next 16 (route handlers) y Supabase (supabase-js, RPC `security definer`).
- Tests de lógica con `node --experimental-strip-types`.
- Tests de SQL contra un Postgres 16 descartable en Docker.

**Diseño:** `Proyectos/CRM SaaS/docs/superpowers/specs/2026-09-15-pagos-y-activacion-design.md`, secciones 1 y 2.

**Dónde se trabaja:** worktree `C:\Users\Pastori\OneDrive\Desktop\Proyectos\TijerApp\tijerapp-crm-activate`, rama `claude/crm-activate`, desde `origin/main`.

---

## Archivos

| Archivo | Qué hace |
|---|---|
| Crear `src/lib/crm-activate.ts` | Valida y normaliza el cuerpo, calcula el hash del pedido, traduce errores de la RPC. Sin DB ni red |
| Crear `scripts/test-crm-activate.ts` | Tests de la lógica anterior |
| Crear `supabase/migrations/20260915120000_crm_activate.sql` | Columnas `command_id`, `request_hash`, `paid_at`, `source` en `barbershop_payments` y RPC `crm_activate_barbershop` |
| Crear `scripts/sql/crm-activate-stub.sql` | Esquema mínimo para probar la RPC fuera de Supabase |
| Crear `scripts/sql/test-crm-activate.sql` | Tests de la RPC |
| Crear `scripts/test-crm-activate-sql.sh` | Levanta Postgres en Docker, aplica stub + migraciones, corre los tests |
| Crear `src/app/api/crm/activate/route.ts` | La ruta |
| Modificar `src/lib/crm-export.ts` | `PaymentRow.paid_at` y `paidAt` usa `paid_at` si está |
| Modificar `src/lib/crm-export-datos.ts:67` | Leer `paid_at` |
| Modificar `scripts/test-crm-export.ts` | Test del `paidAt` |
| Modificar `package.json` | Sumar `test-crm-activate.ts` a `test:unit` |

---

### Task 0: Dependencias del worktree

- [ ] **Step 1: Enlazar `node_modules` del checkout principal** (mismo `package-lock.json` que `origin/main`, verificado con `git diff`)

```bash
cd "C:/Users/Pastori/OneDrive/Desktop/Proyectos/TijerApp/tijerapp-crm-activate"
cmd //c mklink /J node_modules "..\\tijerapp\\node_modules"
```

Expected: `Junction created for node_modules`.

---

### Task 1: Validación del pedido

**Files:**
- Create: `src/lib/crm-activate.ts`
- Test: `scripts/test-crm-activate.ts`

- [ ] **Step 1: Escribir el test que falla**

`scripts/test-crm-activate.ts`:

```ts
/**
 * Tests de la activación desde crmsaas (lógica pura, sin DB ni red).
 *
 * Lo que se cuida: que un pedido mal armado no llegue a la base, que el
 * importe no pase por punto flotante, y que dos pedidos con el mismo contenido
 * den el mismo hash (de eso depende no cobrar dos veces).
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-crm-activate.ts
 */
import {
  parseActivationBody,
  requestHashOf,
  rpcErrorResponse,
} from "../src/lib/crm-activate.ts";

let passed = 0;
let failed = 0;

function check(name: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${expected}, obtenido ${got}`}`);
  if (ok) passed++;
  else failed++;
}

function pedido(extra: Record<string, unknown> = {}) {
  return {
    contractVersion: 1,
    commandId: "aaaaaaaa-0000-4000-8000-000000000001",
    accountExternalId: "11111111-1111-4111-8111-111111111111",
    amount: "12000",
    currency: "ARS",
    method: "transferencia",
    reference: "  comprobante 123  ",
    paidAt: "2026-09-15T12:00:00-03:00",
    coverageStart: "2026-09-15T00:00:00.000Z",
    coverageEnd: "2026-10-15T00:00:00.000Z",
    ...extra,
  };
}

function campoConError(body: unknown): string {
  const r = parseActivationBody(body);
  return r.ok ? "(ninguno)" : Object.keys(r.fields).sort().join(",");
}

console.log("\n— Un pedido válido —");
{
  const r = parseActivationBody(pedido());
  check("se acepta", r.ok, true);
  if (r.ok) {
    check("el importe queda con dos decimales", r.data.amount, "12000.00");
    check("la referencia se recorta", r.data.reference, "comprobante 123");
    check("las fechas se normalizan a UTC", r.data.paidAt, "2026-09-15T15:00:00.000Z");
    check("el pagado hasta viaja entero", r.data.coverageEnd, "2026-10-15T00:00:00.000Z");
  }
}
{
  const r = parseActivationBody(pedido({ amount: "100.5", reference: "" }));
  check("un decimal de un dígito se completa", r.ok && r.data.amount, "100.50");
  check("una referencia vacía es null", r.ok && r.data.reference, null);
}
{
  const r = parseActivationBody(pedido({ reference: undefined }));
  check("sin referencia también se acepta", r.ok && r.data.reference, null);
}

console.log("\n— Lo que no llega a la base —");
check("otra versión del contrato", campoConError(pedido({ contractVersion: 2 })), "contractVersion");
check("un body que no es objeto", campoConError("hola"), "body");
check("commandId que no es uuid", campoConError(pedido({ commandId: "123" })), "commandId");
check("cuenta que no es uuid", campoConError(pedido({ accountExternalId: "lopez" })), "accountExternalId");
check("importe cero", campoConError(pedido({ amount: "0" })), "amount");
check("importe negativo", campoConError(pedido({ amount: "-100" })), "amount");
check("importe como número de JS", campoConError(pedido({ amount: 12000 })), "amount");
check("importe con tres decimales", campoConError(pedido({ amount: "10.555" })), "amount");
check("otra moneda", campoConError(pedido({ currency: "USD" })), "currency");
check("medio desconocido", campoConError(pedido({ method: "cheque" })), "method");
check("referencia larguísima", campoConError(pedido({ reference: "x".repeat(121) })), "reference");
check("fecha ilegible", campoConError(pedido({ paidAt: "ayer" })), "paidAt");
check(
  "la cobertura no puede terminar antes de empezar",
  campoConError(pedido({ coverageEnd: "2026-09-01T00:00:00.000Z" })),
  "coverageEnd",
);
check(
  "ni terminar el mismo instante",
  campoConError(pedido({ coverageEnd: "2026-09-15T00:00:00.000Z" })),
  "coverageEnd",
);

console.log("\n— Hash del pedido —");
{
  const a = parseActivationBody(pedido());
  const b = parseActivationBody(pedido({ amount: "12000.00", reference: "comprobante 123" }));
  const c = parseActivationBody(pedido({ amount: "12001" }));
  if (a.ok && b.ok && c.ok) {
    check("el mismo contenido escrito distinto da el mismo hash", requestHashOf(a.data), requestHashOf(b.data));
    check("otro importe da otro hash", requestHashOf(a.data) === requestHashOf(c.data), false);
    check("es un sha256 en hex", /^[0-9a-f]{64}$/.test(requestHashOf(a.data)), true);
  } else {
    check("los tres pedidos del hash son válidos", false, true);
  }
}

console.log("\n— Errores de la RPC —");
check("cuenta inexistente es 404", rpcErrorResponse("account_not_found")?.status, 404);
check("mismo commandId con otro contenido es 409", rpcErrorResponse("command_conflict")?.status, 409);
check("y se contesta con su código", rpcErrorResponse("command_conflict")?.error, "command_conflict");
check("cualquier otro error no se traduce", rpcErrorResponse("connection reset"), null);

console.log(`\n${passed} pasaron, ${failed} fallaron`);
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Correr y ver que falla**

Run: `node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-crm-activate.ts`

Expected: error `Cannot find module ... src/lib/crm-activate.ts`.

- [ ] **Step 3: Implementar**

`src/lib/crm-activate.ts`:

```ts
/**
 * Activación desde crmsaas (contrato de activación v1): lógica pura.
 *
 * El CRM registra un pago y TijerApp activa la barbería hasta la fecha pagada.
 * Acá se decide qué pedido es válido **antes** de tocar la base, y se calcula
 * el hash con el que la RPC distingue una repetición de un pedido distinto.
 *
 * El importe viaja como texto y se normaliza como texto: el punto flotante
 * pierde centavos.
 */
import { createHash } from "node:crypto";

export const ACTIVATION_METHODS = ["transferencia", "efectivo", "mercadopago", "otro"] as const;
export type ActivationMethod = (typeof ACTIVATION_METHODS)[number];

export type ActivationRequest = {
  commandId: string;
  accountExternalId: string;
  /** Con dos decimales: "12000.00". */
  amount: string;
  currency: "ARS";
  method: ActivationMethod;
  reference: string | null;
  /** ISO en UTC. */
  paidAt: string;
  coverageStart: string;
  /** Pagado hasta. */
  coverageEnd: string;
};

export type ParseResult =
  | { ok: true; data: ActivationRequest }
  | { ok: false; fields: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMPORTE = /^\d{1,10}(\.\d{1,2})?$/;
const MAX_REFERENCIA = 120;

function normalizarImporte(texto: string): string | null {
  if (!IMPORTE.test(texto)) return null;
  const [entera, decimal = ""] = texto.split(".");
  const enteraLimpia = entera.replace(/^0+(?=\d)/, "");
  const normalizado = `${enteraLimpia}.${`${decimal}00`.slice(0, 2)}`;
  return /^0\.00$/.test(normalizado) ? null : normalizado;
}

function fechaIso(valor: unknown): string | null {
  if (typeof valor !== "string" || valor.trim() === "") return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

export function parseActivationBody(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, fields: { body: "Tiene que ser un objeto JSON." } };
  }
  const b = body as Record<string, unknown>;
  const fields: Record<string, string> = {};

  if (b.contractVersion !== 1) fields.contractVersion = "Sólo se acepta la versión 1.";

  const commandId = typeof b.commandId === "string" ? b.commandId.trim() : "";
  if (!UUID.test(commandId)) fields.commandId = "Tiene que ser un uuid.";

  const accountExternalId =
    typeof b.accountExternalId === "string" ? b.accountExternalId.trim() : "";
  if (!UUID.test(accountExternalId)) fields.accountExternalId = "Tiene que ser el id de la barbería.";

  const amount = typeof b.amount === "string" ? normalizarImporte(b.amount.trim()) : null;
  if (amount === null) fields.amount = "Importe mayor que cero, como texto, con hasta dos decimales.";

  if (b.currency !== "ARS") fields.currency = "TijerApp sólo cobra en ARS.";

  const method = b.method;
  if (typeof method !== "string" || !(ACTIVATION_METHODS as readonly string[]).includes(method)) {
    fields.method = `Uno de: ${ACTIVATION_METHODS.join(", ")}.`;
  }

  let reference: string | null = null;
  if (b.reference !== undefined && b.reference !== null) {
    if (typeof b.reference !== "string") {
      fields.reference = "Tiene que ser texto.";
    } else {
      const recortada = b.reference.trim();
      if (recortada.length > MAX_REFERENCIA) fields.reference = `Hasta ${MAX_REFERENCIA} caracteres.`;
      else reference = recortada || null;
    }
  }

  const paidAt = fechaIso(b.paidAt);
  if (!paidAt) fields.paidAt = "Fecha ISO 8601.";
  const coverageStart = fechaIso(b.coverageStart);
  if (!coverageStart) fields.coverageStart = "Fecha ISO 8601.";
  const coverageEnd = fechaIso(b.coverageEnd);
  if (!coverageEnd) fields.coverageEnd = "Fecha ISO 8601.";
  else if (coverageStart && coverageEnd <= coverageStart) {
    fields.coverageEnd = "Tiene que ser posterior al inicio de la cobertura.";
  }

  if (Object.keys(fields).length > 0) return { ok: false, fields };

  return {
    ok: true,
    data: {
      commandId: commandId.toLowerCase(),
      accountExternalId: accountExternalId.toLowerCase(),
      amount: amount!,
      currency: "ARS",
      method: method as ActivationMethod,
      reference,
      paidAt: paidAt!,
      coverageStart: coverageStart!,
      coverageEnd: coverageEnd!,
    },
  };
}

/**
 * Hash del contenido ya normalizado, con orden de campos fijo.
 *
 * Se calcula sobre lo normalizado a propósito: "12000" y "12000.00" son el
 * mismo pedido, y un reintento del CRM no puede chocar por cómo lo escribió.
 */
export function requestHashOf(data: ActivationRequest): string {
  const canonico = JSON.stringify([
    data.commandId,
    data.accountExternalId,
    data.amount,
    data.currency,
    data.method,
    data.reference,
    data.paidAt,
    data.coverageStart,
    data.coverageEnd,
  ]);
  return createHash("sha256").update(canonico).digest("hex");
}

/** Los dos errores que la RPC levanta a propósito. El resto es un 500. */
export function rpcErrorResponse(
  message: string,
): { status: 404 | 409; error: "account_not_found" | "command_conflict" } | null {
  if (message === "account_not_found") return { status: 404, error: "account_not_found" };
  if (message === "command_conflict") return { status: 409, error: "command_conflict" };
  return null;
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-crm-activate.ts`

Expected: todas las líneas con `✓` y `N pasaron, 0 fallaron`.

- [ ] **Step 5: Sumarlo a `test:unit`**

En `package.json`, al final del script `test:unit`, después de `scripts/test-crm-export.ts`, agregar:

```
 && node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-crm-activate.ts
```

Run: `npm run test:unit`. Expected: termina con exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/crm-activate.ts scripts/test-crm-activate.ts package.json
git commit -m "feat(crm): validar el pedido de activación desde crmsaas"
```

---

### Task 2: RPC atómica e idempotente

**Files:**
- Create: `supabase/migrations/20260915120000_crm_activate.sql`
- Create: `scripts/sql/crm-activate-stub.sql`
- Create: `scripts/sql/test-crm-activate.sql`
- Create: `scripts/test-crm-activate-sql.sh`

- [ ] **Step 1: Esquema mínimo para probar sin Supabase**

`scripts/sql/crm-activate-stub.sql`:

```sql
-- Esquema mínimo para probar crm_activate_barbershop en un Postgres suelto.
-- Copia las columnas reales de barbershops (20260525173000) y
-- barbershop_subscriptions (20260607230000) que la RPC usa. No es una migración.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;

create table public.barbershops (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text not null unique,
  name text not null
);

create type plan_tier as enum ('solo', 'esencial', 'pro');
create type subscription_status as enum ('trial', 'active', 'grace', 'expired', 'cancelled');

create table public.barbershop_subscriptions (
  id uuid primary key default gen_random_uuid(),
  barbershop_slug text not null unique references public.barbershops(slug) on delete cascade,
  plan_tier plan_tier not null default 'pro',
  status subscription_status not null default 'trial',
  trial_started_at timestamptz null,
  trial_expires_at timestamptz null,
  grace_expires_at timestamptz null,
  current_period_started_at timestamptz null,
  current_period_ends_at timestamptz null,
  assigned_by_owner_id uuid null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- [ ] **Step 2: Escribir los tests de la RPC**

`scripts/sql/test-crm-activate.sql`:

```sql
-- Tests de crm_activate_barbershop. Corre después del stub y de las migraciones.
-- Cada bloque falla con un mensaje claro; psql corre con ON_ERROR_STOP.

insert into public.barbershops (id, slug, name) values
  ('11111111-1111-4111-8111-111111111111', 'lopez', 'Barbería López'),
  ('22222222-2222-4222-8222-222222222222', 'sin-fila', 'Barbería Sin Fila');

insert into public.barbershop_subscriptions (barbershop_slug, status, trial_started_at, trial_expires_at)
values ('lopez', 'trial', '2026-09-01T00:00:00Z', '2026-09-15T00:00:00Z');

do $$
declare r jsonb;
begin
  r := public.crm_activate_barbershop(
    '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', 'hash-1',
    12000.00, 'transferencia', 'comprobante 1',
    '2026-09-15T12:00:00Z', '2026-09-15T00:00:00Z', '2026-10-15T00:00:00Z');
  assert (r->>'replayed')::boolean = false, 'T1: no es una repetición';
  assert (r->>'paid_until')::timestamptz = '2026-10-15T00:00:00Z', 'T1: pagado hasta la fecha pedida';
  assert (select status::text from barbershop_subscriptions where barbershop_slug = 'lopez') = 'active', 'T1: queda activa';
  assert (select trial_expires_at from barbershop_subscriptions where barbershop_slug = 'lopez') is null, 'T1: sin prueba';
  assert (select current_period_ends_at from barbershop_subscriptions where barbershop_slug = 'lopez') = '2026-10-15T00:00:00Z', 'T1: período';
  assert (select count(*) from barbershop_payments) = 1, 'T1: un pago';
  assert (select source from barbershop_payments) = 'crm', 'T1: origen crm';
  assert (select paid_at from barbershop_payments) = '2026-09-15T12:00:00Z', 'T1: fecha de pago';
  assert (select note from barbershop_payments) = 'comprobante 1', 'T1: la referencia queda en la nota';
  raise notice 'ok T1 activa hasta la fecha pagada';
end $$;

do $$
declare r jsonb; primero uuid;
begin
  select id into primero from barbershop_payments;
  r := public.crm_activate_barbershop(
    '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', 'hash-1',
    12000.00, 'transferencia', 'comprobante 1',
    '2026-09-15T12:00:00Z', '2026-09-15T00:00:00Z', '2026-10-15T00:00:00Z');
  assert (r->>'replayed')::boolean = true, 'T2: es una repetición';
  assert (r->>'payment_id')::uuid = primero, 'T2: devuelve el mismo pago';
  assert (select count(*) from barbershop_payments) = 1, 'T2: no duplica';
  raise notice 'ok T2 repetir no duplica';
end $$;

do $$
begin
  perform public.crm_activate_barbershop(
    '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000001', 'hash-otro',
    99.00, 'efectivo', null,
    '2026-09-15T12:00:00Z', '2026-09-15T00:00:00Z', '2026-10-15T00:00:00Z');
  raise exception 'T3: tenía que fallar';
exception when others then
  assert sqlerrm = 'command_conflict', 'T3: esperaba command_conflict, vino ' || sqlerrm;
  assert (select count(*) from barbershop_payments) = 1, 'T3: no escribe';
  raise notice 'ok T3 mismo commandId con otro contenido es conflicto';
end $$;

do $$
begin
  perform public.crm_activate_barbershop(
    '99999999-9999-4999-8999-999999999999', 'aaaaaaaa-0000-4000-8000-000000000003', 'hash-3',
    12000.00, 'transferencia', null,
    '2026-09-15T12:00:00Z', '2026-09-15T00:00:00Z', '2026-10-15T00:00:00Z');
  raise exception 'T4: tenía que fallar';
exception when others then
  assert sqlerrm = 'account_not_found', 'T4: esperaba account_not_found, vino ' || sqlerrm;
  raise notice 'ok T4 barbería inexistente';
end $$;

do $$
declare r jsonb;
begin
  -- Un pago viejo cargado tarde: cubre hasta el 1/10, pero ya estaba pago hasta el 15/10.
  r := public.crm_activate_barbershop(
    '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-0000-4000-8000-000000000005', 'hash-5',
    12000.00, 'transferencia', null,
    '2026-09-01T12:00:00Z', '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z');
  assert (r->>'paid_until')::timestamptz = '2026-10-15T00:00:00Z', 'T5: no acorta el período';
  assert (select current_period_ends_at from barbershop_subscriptions where barbershop_slug = 'lopez') = '2026-10-15T00:00:00Z', 'T5: período intacto';
  assert (select count(*) from barbershop_payments) = 2, 'T5: el pago igual queda registrado';
  raise notice 'ok T5 un pago viejo no acorta el período';
end $$;

do $$
declare r jsonb;
begin
  r := public.crm_activate_barbershop(
    '22222222-2222-4222-8222-222222222222', 'aaaaaaaa-0000-4000-8000-000000000006', 'hash-6',
    12000.00, 'mercadopago', null,
    '2026-09-15T12:00:00Z', '2026-09-15T00:00:00Z', '2026-10-15T00:00:00Z');
  assert (select status::text from barbershop_subscriptions where barbershop_slug = 'sin-fila') = 'active', 'T6: crea la fila activa';
  assert (select current_period_ends_at from barbershop_subscriptions where barbershop_slug = 'sin-fila') = '2026-10-15T00:00:00Z', 'T6: con su período';
  raise notice 'ok T6 una barbería sin fila de suscripción queda activa';
end $$;

do $$
begin
  assert not has_function_privilege('anon', 'public.crm_activate_barbershop(uuid, uuid, text, numeric, text, text, timestamptz, timestamptz, timestamptz)', 'execute'), 'T7: anon no ejecuta';
  assert not has_function_privilege('authenticated', 'public.crm_activate_barbershop(uuid, uuid, text, numeric, text, text, timestamptz, timestamptz, timestamptz)', 'execute'), 'T7: authenticated no ejecuta';
  assert has_function_privilege('service_role', 'public.crm_activate_barbershop(uuid, uuid, text, numeric, text, text, timestamptz, timestamptz, timestamptz)', 'execute'), 'T7: service_role sí';
  raise notice 'ok T7 sólo el service_role puede activar';
end $$;
```

- [ ] **Step 3: Script que corre todo en Docker**

`scripts/test-crm-activate-sql.sh`:

```bash
#!/usr/bin/env bash
# Prueba la RPC crm_activate_barbershop en un Postgres 16 descartable.
# Requiere Docker. No toca Supabase.
set -euo pipefail
cd "$(dirname "$0")/.."

NAME=tijerapp-crm-activate-sql
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test postgres:16 >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT

until docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done

cat scripts/sql/crm-activate-stub.sql \
    supabase/migrations/20260707120000_barber_billing.sql \
    supabase/migrations/20260915120000_crm_activate.sql \
    scripts/sql/test-crm-activate.sql \
  | docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q
```

- [ ] **Step 4: Correr y ver que falla**

Run: `bash scripts/test-crm-activate-sql.sh`

Expected: `No such file` para `20260915120000_crm_activate.sql` (o, si existiera vacía, `function public.crm_activate_barbershop(...) does not exist`).

- [ ] **Step 5: Escribir la migración**

`supabase/migrations/20260915120000_crm_activate.sql`:

```sql
-- Activación desde crmsaas (contrato de activación v1).
-- Aditivo: cuatro columnas en barbershop_payments y una RPC nueva.
-- No toca register_barbershop_payment ni datos existentes.

alter table public.barbershop_payments
  add column if not exists command_id uuid null,
  add column if not exists request_hash text null,
  add column if not exists paid_at timestamptz null,
  add column if not exists source text not null default 'owner';

-- Un pedido del CRM entra una sola vez. Los pagos del owner no tienen command_id.
create unique index if not exists barbershop_payments_command_id_key
  on public.barbershop_payments (command_id)
  where command_id is not null;

create or replace function public.crm_activate_barbershop(
  p_barbershop_id uuid,
  p_command_id uuid,
  p_request_hash text,
  p_amount numeric,
  p_method text,
  p_reference text,
  p_paid_at timestamptz,
  p_coverage_start timestamptz,
  p_coverage_end timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_existing public.barbershop_payments;
  v_current_end timestamptz;
  v_paid_until timestamptz;
  v_payment public.barbershop_payments;
begin
  -- Repetición: el mismo pedido devuelve lo mismo; otro contenido es conflicto.
  select * into v_existing from public.barbershop_payments where command_id = p_command_id;
  if found then
    if v_existing.request_hash is distinct from p_request_hash then
      raise exception 'command_conflict';
    end if;
    return jsonb_build_object(
      'payment_id', v_existing.id,
      'paid_until', (select current_period_ends_at from public.barbershop_subscriptions
                      where barbershop_slug = v_existing.barbershop_slug),
      'replayed', true);
  end if;

  select slug into v_slug from public.barbershops where id = p_barbershop_id;
  if v_slug is null then
    raise exception 'account_not_found';
  end if;

  -- Una barbería sin fila de suscripción tiene una prueba sólo en memoria
  -- (getBarbershopPlan): se crea la fila para que el pago tenga dónde quedar.
  insert into public.barbershop_subscriptions (barbershop_slug, status)
  values (v_slug, 'active')
  on conflict (barbershop_slug) do nothing;

  select current_period_ends_at into v_current_end
    from public.barbershop_subscriptions
   where barbershop_slug = v_slug
   for update;

  -- Un pago viejo cargado tarde no acorta un período vigente.
  -- greatest ignora el null de una barbería que nunca pagó.
  v_paid_until := greatest(v_current_end, p_coverage_end);

  insert into public.barbershop_payments (
    barbershop_slug, amount, method, period_start, period_end, note,
    registered_by, command_id, request_hash, paid_at, source
  ) values (
    v_slug, p_amount, p_method, p_coverage_start, p_coverage_end, p_reference,
    'crmsaas', p_command_id, p_request_hash, p_paid_at, 'crm'
  )
  returning * into v_payment;

  update public.barbershop_subscriptions
     set current_period_started_at = case
           when v_current_end is null or p_coverage_end > v_current_end then p_coverage_start
           else current_period_started_at
         end,
         current_period_ends_at = v_paid_until,
         status                 = 'active',
         trial_expires_at       = null,
         grace_expires_at       = null,
         updated_at             = now()
   where barbershop_slug = v_slug;

  return jsonb_build_object('payment_id', v_payment.id, 'paid_until', v_paid_until, 'replayed', false);
exception
  when unique_violation then
    -- Dos pedidos iguales a la vez: el segundo espera al primero y choca con
    -- el índice. Si es el mismo contenido, es una repetición.
    select * into v_existing from public.barbershop_payments where command_id = p_command_id;
    if found and v_existing.request_hash = p_request_hash then
      return jsonb_build_object('payment_id', v_existing.id, 'paid_until', v_existing.period_end, 'replayed', true);
    end if;
    raise exception 'command_conflict';
end;
$$;

revoke all on function public.crm_activate_barbershop(
  uuid, uuid, text, numeric, text, text, timestamptz, timestamptz, timestamptz
) from public, anon, authenticated;

grant execute on function public.crm_activate_barbershop(
  uuid, uuid, text, numeric, text, text, timestamptz, timestamptz, timestamptz
) to service_role;
```

- [ ] **Step 6: Correr y ver que pasa**

Run: `bash scripts/test-crm-activate-sql.sh`

Expected: siete `NOTICE`, de `ok T1…` a `ok T7…`, y exit 0.

- [ ] **Step 7: Sabotaje, para confirmar que los tests muerden**

Cambiar temporalmente `v_paid_until := greatest(v_current_end, p_coverage_end);` por `v_paid_until := p_coverage_end;`.

Run: `bash scripts/test-crm-activate-sql.sh`. Expected: falla en `T5: no acorta el período`.

Deshacer el cambio y volver a correr. Expected: pasa.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260915120000_crm_activate.sql scripts/sql scripts/test-crm-activate-sql.sh
git commit -m "feat(crm): RPC para activar una barbería con su pago, sin duplicar"
```

---

### Task 3: La ruta

**Files:**
- Create: `src/app/api/crm/activate/route.ts`

- [ ] **Step 1: Implementar** (la lógica ya está testeada en Task 1 y la RPC en Task 2; la ruta sólo las une)

`src/app/api/crm/activate/route.ts`:

```ts
/**
 * Activación desde crmsaas (contrato de activación v1).
 *
 *   POST /api/crm/activate
 *   Authorization: Bearer ${CRM_ACTIVATE_TOKEN}
 *
 * El CRM registra el pago de una barbería y TijerApp la activa hasta la fecha
 * pagada, en una sola operación (RPC `crm_activate_barbershop`). Pasada esa
 * fecha, `resolvePlanStatus` le da 7 días de gracia y la bloquea: no hace
 * falta nada más de este lado.
 *
 * **Token propio**, distinto del de exportación: quien tenga el de lectura no
 * puede activar a nadie. Sin token configurado se rechaza (503).
 */
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { tokenMatches } from "@/lib/crm-export";
import { parseActivationBody, requestHashOf, rpcErrorResponse } from "@/lib/crm-activate";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearerDe(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function POST(request: Request) {
  const esperado = process.env.CRM_ACTIVATE_TOKEN?.trim();
  if (!esperado) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!tokenMatches(esperado, bearerDe(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid", fields: { body: "No es JSON." } },
      { status: 422 },
    );
  }

  const parsed = parseActivationBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid", fields: parsed.fields }, { status: 422 });
  }
  const pedido = parsed.data;

  const { data, error } = await getSupabaseAdminClient().rpc(
    "crm_activate_barbershop" as never,
    {
      p_barbershop_id: pedido.accountExternalId,
      p_command_id: pedido.commandId,
      p_request_hash: requestHashOf(pedido),
      p_amount: pedido.amount,
      p_method: pedido.method,
      p_reference: pedido.reference,
      p_paid_at: pedido.paidAt,
      p_coverage_start: pedido.coverageStart,
      p_coverage_end: pedido.coverageEnd,
    } as never,
  );

  if (error) {
    const conocido = rpcErrorResponse(error.message);
    if (conocido) {
      return NextResponse.json({ error: conocido.error }, { status: conocido.status });
    }
    // Sin detalle hacia afuera: un error de base puede traer fragmentos de consulta.
    Sentry.captureException(error, { tags: { route: "crm/activate", step: "rpc" } });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const resultado = data as { payment_id: string; paid_until: string; replayed: boolean };
  return NextResponse.json({
    paymentId: resultado.payment_id,
    accountExternalId: pedido.accountExternalId,
    status: "active",
    paidUntil: new Date(resultado.paid_until).toISOString(),
    replayed: resultado.replayed,
  });
}
```

- [ ] **Step 2: Tipos y lint**

Run: `npx tsc --noEmit` y `npx eslint src/app/api/crm/activate/route.ts src/lib/crm-activate.ts`

Expected: sin errores.

- [ ] **Step 3: Probar la ruta a mano sin tocar la base** (token faltante, token malo, cuerpo inválido)

```bash
CRM_ACTIVATE_TOKEN= npx next dev --port 3310
```

Desde otra terminal:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3310/api/crm/activate
```

Expected: `503`. Cortar el server.

```bash
CRM_ACTIVATE_TOKEN=token-de-prueba npx next dev --port 3310
```

```bash
curl -s -w " %{http_code}\n" -X POST -H "authorization: Bearer otro" http://localhost:3310/api/crm/activate
curl -s -w " %{http_code}\n" -X POST -H "authorization: Bearer token-de-prueba" -H "content-type: application/json" -d '{"contractVersion":1}' http://localhost:3310/api/crm/activate
```

Expected: `{"error":"unauthorized"} 401`, y después `{"error":"invalid","fields":{...}} 422` con `commandId`, `amount`, etc. en `fields`. Ninguno de los dos llega a la RPC. Cortar el server.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/crm/activate/route.ts
git commit -m "feat(crm): POST /api/crm/activate, activar una barbería desde crmsaas"
```

---

### Task 4: El exportador manda la fecha de pago real

**Files:**
- Modify: `src/lib/crm-export.ts` (tipo `PaymentRow` y `toPaymentRecord`)
- Modify: `src/lib/crm-export-datos.ts:67`
- Test: `scripts/test-crm-export.ts`

- [ ] **Step 1: Test que falla**

En `scripts/test-crm-export.ts`, debajo de `check("un cobro con importe ilegible no se exporta", ...)`:

```ts
check(
  "la fecha de pago es la informada, no la de carga",
  toPaymentRecord(cobro({ paid_at: "2026-08-30T15:00:00.000Z" }), ID)?.paidAt,
  "2026-08-30T15:00:00.000Z",
);
check(
  "sin fecha informada se usa la de carga, como antes",
  toPaymentRecord(cobro({ paid_at: null }), ID)?.paidAt,
  pago?.paidAt,
);
```

Run: `node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-crm-export.ts`

Expected: falla la primera (`paid_at` no existe en `PaymentRow` o se ignora).

- [ ] **Step 2: Implementar**

En `src/lib/crm-export.ts`, tipo `PaymentRow`, agregar después de `period_end`:

```ts
  /** Cuándo entró el dinero, si se informó (pagos cargados desde crmsaas). */
  paid_at?: string | null;
```

En `toPaymentRecord`, reemplazar `paidAt: iso(row.created_at),` por:

```ts
    // Los pagos del owner no traen fecha de pago: se usa la de carga, como siempre.
    paidAt: iso(row.paid_at ?? row.created_at),
```

En `src/lib/crm-export-datos.ts:67`, reemplazar el select por:

```ts
    .select("id, barbershop_slug, amount, method, period_start, period_end, paid_at, created_at")
```

- [ ] **Step 3: Correr y ver que pasa**

Run: `npm run test:unit`. Expected: exit 0, incluidas las dos checks nuevas.

- [ ] **Step 4: Commit**

```bash
git add src/lib/crm-export.ts src/lib/crm-export-datos.ts scripts/test-crm-export.ts
git commit -m "feat(crm): exportar la fecha de pago informada"
```

---

### Task 5: Verificación final y PR

- [ ] **Step 1:** `npm run test:unit`, `bash scripts/test-crm-activate-sql.sh`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Expected: todo en verde.
- [ ] **Step 2:** `git push -u origin claude/crm-activate` y abrir PR en `pastorig/TijerApp` con resumen, migración aditiva, variable nueva `CRM_ACTIVATE_TOKEN` y cómo se verificó.

### Task 6: Salida a producción (con confirmación explícita de Bautista en cada paso)

- [ ] **Step 1:** Aplicar la migración en Supabase de producción (`npm run supabase:db:push`), después de `supabase migration list` para ver que sólo falta `20260915120000`.
- [ ] **Step 2:** Bautista carga `CRM_ACTIVATE_TOKEN` en Vercel (Production) con un valor nuevo y aleatorio. Claude no ve ni escribe el valor.
- [ ] **Step 3:** Mergear el PR y verificar el deploy: `POST /api/crm/activate` sin token responde `401` (no `503`, que indicaría que falta la variable).
