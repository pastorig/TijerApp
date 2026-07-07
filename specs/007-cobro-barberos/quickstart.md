# Quickstart / Verificación: Cobro de barberos — Fase 1

## Aplicar la migración

La migración `supabase/migrations/20260707120000_barber_billing.sql` es **aditiva** (add column + create table + RPC + RLS). Aplicarla por:
- **MCP de Supabase** (`apply_migration`) contra el proyecto de TijerApp, o
- **SQL Editor** de Supabase (pegar el archivo), o
- `supabase db push` si está configurado el CLI.

Luego registrar el tracking si se usa el flujo de migraciones del CLI.

## Verificación de build (siempre)

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Lógica pura (prioridad — sin DB)

Verificar con asserts ad-hoc (`node --env-file=.env.local -e "..."` o un script temporal) las funciones puras de `src/lib/plans.ts`:
- `resolvePlanStatus`:
  - `pagadoHasta` futuro → `effectiveStatus='active'`, `canAccessFeatures=true`.
  - `pagadoHasta` pasado pero dentro de gracia → `'grace'`, `canAccessFeatures=true`.
  - `pagadoHasta` pasado fuera de gracia → `'expired'`, `canAccessFeatures=false`.
  - `pagadoHasta=null` + trial vigente → igual que hoy (`active`); trial vencido sin gracia → `expired`. **(no-regresión)**
- `addMonths(2026-01-31, 1)` → `2026-02-28`. `computeNextPaidUntil(now, past)` usa `max`.

## Smoke test manual (contra Supabase de prueba)

1. Barbería con plan **vencido** → registrar pago desde `/owner/planes` → queda **activa**, `pagado_hasta = hoy + 1 mes`, aparece en historial.
2. Registrar **segundo** pago antes del vencimiento → `pagado_hasta` = vencimiento previo + 1 mes (no desde hoy).
3. Entrar como barbero **vencido** → el paywall/banner muestra **monto** (precio del tier) + **Alias `pastorinx` · Gino Pastori · CBU 4530000800016883827535** + botón WhatsApp.
4. Barbería en **trial sin pago** → sigue funcionando por el trial (sin cambios).

## Rollback

- Revertir commits del branch (no se mergea a `main` hasta verde).
- Migración down (opcional): `drop table barbershop_payments; alter table barbershop_subscriptions drop column pagado_hasta;`. Con `pagado_hasta=null` el sistema ya vuelve al comportamiento previo.
