# Tasks: Aviso de vencimiento del plan

**Branch**: `015-aviso-vencimiento-plan`
Orden por dependencia. `[P]` = se puede hacer en paralelo con la anterior.

## Fase 1 — La regla, sola

- [ ] **T001** `src/lib/plan-notices.ts`: función pura
      `planNoticeDue({ periodEndsAt, todayYmd })` → `'vence_3d' | 'vence_hoy' | null`.
      Compara fechas en día calendario argentino, no en milisegundos: dos
      fechas del mismo día tienen que dar 0 sin importar la hora.
      Exporta `PLAN_NOTICE_KINDS` y los textos del push.
- [ ] **T002** `scripts/test-plan-notices.ts`: 4 días → null · 3 días →
      `vence_3d` · 2 y 1 día → `vence_3d` (la ventana es "3 o menos") · 0 días
      → `vence_hoy` · vencido ayer → null · sin vencimiento → null · misma
      fecha con horas distintas → `vence_hoy`. Sumarlo a `test:unit`.

## Fase 2 — La tabla

- [ ] **T003** `supabase/migrations/20260819HHMMSS_plan_notice_log.sql`:
      tabla + índice único `(barbershop_slug, kind, period_ends_at)` + RLS
      prendida sin políticas + `revoke all ... from anon, authenticated`
      (las tablas nuevas nacen abiertas para esos roles).
- [ ] **T004** Aplicar la migración. **No aplicarla hasta que el código que la
      usa esté deployado no hace falta acá**: la tabla es aditiva y nada la
      lee todavía, así que se puede aplicar antes sin romper nada.

## Fase 3 — El envío

- [ ] **T005** `src/lib/plan-notices-sender.ts`: dado el `supabase` admin y la
      fecha de hoy, barre `barbershop_subscriptions` con
      `current_period_ends_at` no nulo y `status` al día, calcula el hito con
      T001, intenta insertar en `plan_notice_log` y **trata el `23505` como
      "ya avisado"**, no como error. Si insertó, busca los `user_id` de
      `barbershop_admins`, sus `push_subscriptions` vivas, y encola una fila
      por dispositivo en `push_notification_queue`. Devuelve el detalle por
      barbería. Acepta `dryRun`.
- [ ] **T006** Enganchar en `/api/cron/reminders`: paso nuevo dentro de su
      propio `try/catch` (FR-011), con ventana horaria 10–13 ART salvo
      `?force=true`, y `?planNoticesDryRun=true`. Sumar `planNotices` a la
      respuesta.

## Fase 4 — El cartel

- [ ] **T007** `PlanStatusBanner`: rama nueva para plan pago con
      `daysToPaidExpire !== null && <= 3 && > 0` en estado `active` → banner
      gold con los días y el botón Pagar (el que ya abre el modal con
      alias/CBU/titular). Va **antes** de la rama de silencio, que hoy corta
      con `effectiveStatus === "active"`.
- [ ] **T008** [P] Misma rama para `daysToPaidExpire === 0` → texto de "vence
      hoy", mismo botón.

## Fase 5 — Verificación

- [ ] **T009** `npm run test:unit` + `npx tsc --noEmit` + `npm run lint` +
      `npm run build`.
- [ ] **T010** Andamio temporal + Chrome headless: captura del banner a 3, 1 y
      0 días, escritorio y celular. Borrar el andamio.
- [ ] **T011** Cron en dev con `?force=true&planNoticesDryRun=true` contra la
      base real: confirmar que la lista de avisados es la esperada
      (`leocuts`, que vence el 21/08) y que nadie más entra.
- [ ] **T012** Correr el cron real dos veces y confirmar que la segunda no
      vuelve a avisar (SC-002).

## Fase 6 — Cierre

- [ ] **T013** Merge a `main` + push (deploy autónomo) + borrar la rama.
- [ ] **T014** Anotar en `PENDIENTES.md` que el aviso ya existe, para que no se
      vuelva a pedir.

## Lo que NO se hace

- Email y WhatsApp (fuera de alcance).
- Cambiar el comportamiento del vencimiento en sí.
- Tocar los avisos de fin de prueba, que ya funcionan.
