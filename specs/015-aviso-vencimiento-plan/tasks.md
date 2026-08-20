# Tasks: Aviso de vencimiento del plan

**Branch**: `015-aviso-vencimiento-plan` — **CERRADA**, mergeada a `main` y en
producción el 20/08/2026. Migración aplicada y verificada contra la base.
Orden por dependencia. `[P]` = se puede hacer en paralelo con la anterior.

## Fase 1 — La regla, sola

- [x] **T001** `src/lib/plan-notices.ts`: función pura
      `planNoticeDue({ periodEndsAt, todayYmd })` → `'vence_3d' | 'vence_hoy' | null`.
      Compara fechas en día calendario argentino, no en milisegundos: dos
      fechas del mismo día tienen que dar 0 sin importar la hora.
      Exporta `PLAN_NOTICE_KINDS` y los textos del push.
- [x] **T002** `scripts/test-plan-notices.ts`: 4 días → null · 3 días →
      `vence_3d` · 2 y 1 día → `vence_3d` (la ventana es "3 o menos") · 0 días
      → `vence_hoy` · vencido ayer → null · sin vencimiento → null · misma
      fecha con horas distintas → `vence_hoy`. Sumarlo a `test:unit`.

## Fase 2 — La tabla

- [x] **T003** `supabase/migrations/20260819HHMMSS_plan_notice_log.sql`:
      tabla + índice único `(barbershop_slug, kind, period_ends_at)` + RLS
      prendida sin políticas + `revoke all ... from anon, authenticated`
      (las tablas nuevas nacen abiertas para esos roles).
- [x] **T004** Aplicar la migración. **No aplicarla hasta que el código que la
      usa esté deployado no hace falta acá**: la tabla es aditiva y nada la
      lee todavía, así que se puede aplicar antes sin romper nada.

## Fase 3 — El envío

- [x] **T005** `src/lib/plan-notices-sender.ts`: dado el `supabase` admin y la
      fecha de hoy, barre `barbershop_subscriptions` con
      `current_period_ends_at` no nulo y `status` al día, calcula el hito con
      T001, intenta insertar en `plan_notice_log` y **trata el `23505` como
      "ya avisado"**, no como error. Si insertó, busca los `user_id` de
      `barbershop_admins`, sus `push_subscriptions` vivas, y encola una fila
      por dispositivo en `push_notification_queue`. Devuelve el detalle por
      barbería. Acepta `dryRun`.
- [x] **T006** Enganchar en `/api/cron/reminders`: paso nuevo dentro de su
      propio `try/catch` (FR-011), con ventana horaria 10–13 ART salvo
      `?force=true`, y `?planNoticesDryRun=true`. Sumar `planNotices` a la
      respuesta.

## Fase 4 — El cartel

- [x] **T007** `PlanStatusBanner`: rama nueva para plan pago con
      `daysToPaidExpire !== null && <= 3 && > 0` en estado `active` → banner
      gold con los días y el botón Pagar (el que ya abre el modal con
      alias/CBU/titular). Va **antes** de la rama de silencio, que hoy corta
      con `effectiveStatus === "active"`.
- [x] **T008** [P] Misma rama para `daysToPaidExpire === 0` → texto de "vence
      hoy", mismo botón.

## Fase 5 — Verificación

- [x] **T009** `npm run test:unit` + `npx tsc --noEmit` + `npm run lint` +
      `npm run build`.
- [x] **T010** Andamio temporal + Chrome headless: captura del banner a 3, 1 y
      0 días, escritorio y celular. Borrar el andamio.
- [x] **T011** Cron en dev con `?force=true&planNoticesDryRun=true` contra la
      base real: confirmar que la lista de avisados es la esperada
      (`leocuts`, que vence el 21/08) y que nadie más entra.
- [x] **T012** Correr el cron real dos veces y confirmar que la segunda no
      vuelve a avisar (SC-002).

## Fase 6 — Cierre

- [x] **T013** Merge a `main` + push (deploy autónomo) + borrar la rama.
- [x] **T014** Anotar en `PENDIENTES.md` que el aviso ya existe, para que no se
      vuelva a pedir.

## Lo que salió durante la implementación

- **T004 (migración)**: aplicada por Claude vía MCP de Supabase el 20/08, después
  de que Bautista diera acceso a la organización. Verificado a mano: tabla,
  índice único, RLS prendida y cero permisos para anon/authenticated. El candado
  se probó por el mismo camino que usa el cron — el segundo insert del mismo
  aviso devuelve `23505`, que es el código que el código interpreta como "ya
  avisado". Era una suposición y había que confirmarla.
- **El precio que se mostraba estaba mal para los fundadores.** Salió al mirar
  el cartel con datos de `leocuts`: decía $33.000 (el tier asignado) cuando
  paga $22.000. Se corrigió en el mismo lugar para el cartel, el paywall, el
  prefill del owner, el MRR y el texto del push. Ver `billedTier` en plans.ts.
- **T011 dejó basura en prod**: correr el cron con `force=true` desde el dev
  local intenta los envíos reales de TODO el endpoint, no solo del paso nuevo.
  Dejó 20 filas `failed` en `reminder_log` que hubo que borrar. El flag de
  simulación cubre el paso nuevo, no el resto.

## Lo que NO se hace

- Email y WhatsApp (fuera de alcance).
- Cambiar el comportamiento del vencimiento en sí.
- Tocar los avisos de fin de prueba, que ya funcionan.
