# Tasks: Cobro de seña con MercadoPago al reservar

**Branch**: `003-mp-deposit-checkout`
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)
**Created**: 2026-06-21
**Status**: Ready

## Conventions

- Formato: `- [ ] [TaskID] [P?] [Story?] Descripción con ruta de archivo`.
- `[P]` = paralelizable (archivos distintos, sin dependencia pendiente).
- `[US#]` = a qué user story pertenece (solo en fases de user story).
- Sin migración nueva: el esquema ya existe (`20260607210000_mercadopago_deposits.sql`).

## User Stories (derivadas del spec)

- **US1 (P1)** — Cliente reserva, paga la seña y el turno se confirma automáticamente. (MVP)
- **US2 (P2)** — Turno con seña impaga se auto-cancela al vencer el plazo y libera el horario.
- **US3 (P3)** — Recordatorio de pago al cliente antes de que venza la seña.
- **US4 (P2)** — El barbero ve el estado de la seña en el turnero.

## Dependency Graph

```
Setup (T001)
   └─ Foundational (T002 T003 T004) [BLOCKING]
          ├─ US1 (T005→T006→T007→T008→T009→T010)  ← MVP
          ├─ US2 (T011)            depende de T002/T004
          ├─ US3 (T012 T013)       depende de US2
          └─ US4 (T014)            depende de T004
   Polish (T015 T016 T017 T018)
```

---

## Phase 1: Setup

- [ ] T001 Verificar/documentar env vars necesarias en `specs/003-mp-deposit-checkout/quickstart.md` y `.env.local` de referencia: `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET` (ya existe), y que el panel de cobros permite cargar el Access Token TEST de la barbería. No commitear secretos.

## Phase 2: Foundational [BLOCKING]

- [x] T002 [P] Implementar helper puro `computeDepositAmount({ servicePrice, depositPercent, depositMinAmount })` en `src/lib/mercadopago/deposit.ts` (porcentaje, mínimo, redondeo a entero ARS).
- [x] T003 [P] Extender `src/lib/mercadopago/client.ts` con `createDepositPreference(accessToken, params)` (POST `/checkout/preferences`: items, `external_reference`, `notification_url` con `?bs=`, `back_urls`, `auto_return`, `expires`/`expiration_date_to`) y `getPayment(accessToken, paymentId)` (GET `/v1/payments/{id}`), mismo manejo de errores que `testMPConnection`.
- [x] T004 Exponer al front los campos públicos de seña (`mpEnabled`, `depositPercent`, `depositMinAmount`, `depositAutoCancelHours`) en `src/lib/barbershops.ts` (mapper) + tipos en `src/lib/supabase.ts` y `src/data/demo-barbershops.ts`. **Nunca** exponer `mp_access_token`.

## Phase 3: US1 — Reservar, pagar seña y confirmar (P1 · MVP)

**Objetivo**: una reserva en barbería con seña activa genera el monto correcto, el cliente paga por MP y el turno se confirma solo.
**Test independiente**: reservar → ver monto + botón → pagar con tarjeta TEST aprobada → turno confirmado y "seña pagada" en < 1 min.

- [x] T005 [US1] Crear `POST /api/appointments/book` en `src/app/api/appointments/book/route.ts`: valida barbería `mp_enabled`, resuelve servicio/precio desde DB, calcula seña (T002), inserta turno `pending` con campos de seña (`service_role`), crea preference (T003), persiste `mp_preference_id`/`deposit_amount`/`deposit_status='pending'`/`deposit_expires_at`/`deposit_required=true`, registra `payment_events('preference_created')`. Devuelve `{ appointmentId, token, initPoint, depositAmount }` o error claro (409 slot ocupado, 502 falla preference — FR-001/002/003/012).
- [x] T006 [US1] Crear `POST /api/mp/webhook` en `src/app/api/mp/webhook/route.ts`: resuelve `access_token` por `?bs=`, `getPayment` (T003), valida `approved`, lee `external_reference`, confirma turno idempotente (`status='confirmed'`, `deposit_status='paid'`, `deposit_paid_at`, `mp_payment_id`), registra `payment_events`. No reconfirmar turnos ya `cancelled`/`expired` (FR-005/006/007/103). Responde 200 salvo error interno.
- [x] T007 [P] [US1] Crear `src/components/DepositPaymentPanel.tsx`: muestra monto de seña + botón "Pagar seña" (link a `initPoint`) + estado; reusable en booking y `/r/[token]`. Estética: tokens gold/success existentes, botón `min-h-11`.
- [x] T008 [US1] Modificar `src/components/BookingForm.tsx`: si `barbershop.mpEnabled`, reservar vía `POST /api/appointments/book` (en vez del insert anónimo) y mostrar `DepositPaymentPanel` como cierre (reemplaza el WhatsApp como cierre — FR-004/004b). Si `mpEnabled=false`, flujo intacto (FR-010).
- [x] T009 [US1] Incluir campos de seña (`deposit_status`, `deposit_amount`, `deposit_expires_at`, `init_point`) en el endpoint/lectura pública del turno por token que alimenta `/r/[token]` (`src/app/api/appointments/[token]/route.ts` o equivalente).
- [x] T010 [US1] Modificar `src/app/r/[token]/AppointmentActionPanel.tsx` (y/o la page): mostrar estado de seña y, si está `pending` y no vencida, `DepositPaymentPanel` para pagar/reintentar; manejar retorno de `back_urls` (éxito/pendiente/rechazo — FR-101).

## Phase 4: US2 — Auto-cancelación de seña impaga (P2)

**Objetivo**: turnos con seña pendiente vencida se cancelan y liberan el horario.
**Test independiente**: reservar sin pagar (auto-cancel 1h) → `GET /api/cron/deposits?force=true` → turno cancelado + slot libre + estado "expirada".

- [ ] T011 [US2] Crear `GET /api/cron/deposits` en `src/app/api/cron/deposits/route.ts` (Bearer `CRON_SECRET`, `?force`): expira `deposit_status='pending'` con `deposit_expires_at < now()` → `status='cancelled'`, `deposit_status='expired'`, `cancellation_reason`, `payment_events('auto_expired')` (FR-008). Devuelve `{ expired, reminded }`.

## Phase 5: US3 — Recordatorio de pago (P3)

**Objetivo**: avisar al cliente antes de que venza la seña.
**Test independiente**: reserva pendiente próxima a vencer → cron manda 1 recordatorio (no duplica).

- [ ] T012 [P] [US3] Agregar template de recordatorio de pago de seña con el link en `src/lib/whatsapp.ts` (y/o copy de push).
- [ ] T013 [US3] Extender `GET /api/cron/deposits` (T011): para `deposit_status='pending'` próximos a vencer y sin `reminder_log(kind='deposit_reminder')`, enviar recordatorio (reusar canal push/WhatsApp del cron de reminders) y loggear (FR-013).

## Phase 6: US4 — Estado de seña en el turnero (P2)

**Objetivo**: el barbero distingue pendiente de pago / pagada / expirada.
**Test independiente**: turnos en cada estado muestran el badge correcto.

- [ ] T014 [US4] Agregar badge de estado de seña (pendiente de pago / seña pagada / expirada) en `src/components/admin/AppointmentRow.tsx` (FR-009/102), con tokens de color existentes.

## Phase 7: Polish & Cross-Cutting

- [ ] T015 [P] Sumar el trigger del cron `GET /api/cron/deposits` al schedule de GitHub Actions (junto a `cron/reminders`), mismo `CRON_SECRET`.
- [ ] T016 [P] Unit test del helper `computeDepositAmount` en `scripts/` o el runner de tests existente (porcentaje, mínimo, redondeo, precio 0).
- [ ] T017 Verificación: `npm run lint` + `npm run build` limpios; revisar `payment_events` (un row por paso).
- [ ] T018 QA en sandbox MP siguiendo `quickstart.md` (flujo feliz, expiración, mínimo, rechazo, webhook duplicado, sin seña, token inválido). Requiere credenciales TEST + deploy (lo hace Bautista).

---

## Implementation Strategy

- **MVP = Phase 1 + 2 + 3 (US1)**: con eso ya se cobra y confirma la seña end-to-end. Es lo mínimo demostrable.
- **Incremento 2 = US2 (T011)**: imprescindible antes de producción real (sin auto-cancel, los slots impagos quedan bloqueados).
- **Incremento 3 = US3 + US4**: recordatorio + visibilidad admin (mejoran conversión y operación, no bloquean el cobro).
- **Polish** cierra schedule, tests y QA.

## Parallel Opportunities

- T002 ∥ T003 (helpers independientes).
- T007 (UI panel) ∥ T005/T006 (backend) una vez definida la forma de respuesta.
- T012 ∥ resto de US3 backend.
- T015 ∥ T016 en polish.

## Notes

- No pushear a `main` hasta QA sandbox verde (constitución §7). Merge `--no-ff` al cerrar.
- Bloqueo real para QA completa: credenciales TEST de MP + deploy con URL pública (webhook). Eso lo provee Bautista.
