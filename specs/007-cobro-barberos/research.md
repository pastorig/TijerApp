# Research: Cobro de barberos — Fase 1

## D1. Atomicidad del registro de pago (insert pago + update pagado_hasta)

- **Decision**: RPC Postgres `security definer` `register_barbershop_payment(p_slug, p_amount, p_method, p_period_start, p_period_end, p_note, p_registered_by)` que hace el `insert` en `barbershop_payments` **y** el `update` de `barbershop_subscriptions` (`pagado_hasta`, `status='active'`) en una sola transacción, devolviendo la fila del pago. El cálculo de fechas (`period_start`/`period_end`) se hace en JS (helper puro testeable) y se pasa a la RPC.
- **Rationale**: evita estado parcial (pago huérfano sin extensión de vigencia). Mantiene la lógica de fechas en JS testeable y la atomicidad en SQL. El endpoint owner llama la RPC con el admin client (service_role).
- **Alternatives**: (a) insert + update secuenciales en el endpoint → riesgo de inconsistencia si el update falla; (b) trigger en insert que actualice la sub → lógica oculta, difícil de testear.

## D2. Gracia para planes pagos

- **Decision**: cuando `pagado_hasta` pasa, hay una ventana de gracia = `pagado_hasta + GRACE_DAYS` (reusar 7 días, igual que el trial) antes de `expired`.
- **Rationale**: experiencia consistente para el barbero (no se corta de golpe); da margen para registrar la transferencia.
- **Alternatives**: sin gracia (corte inmediato) → peor UX y más soporte.

## D3. Precedencia pagado_hasta vs trial en `resolvePlanStatus`

- **Decision**: si `pagadoHasta != null` y `rawStatus != 'cancelled'`, se evalúa por `pagado_hasta` (futuro→active, dentro de gracia→grace, sino→expired), **ignorando** el trial. Si `pagadoHasta == null`, se usa el branch de trial/estado existente **sin cambios**.
- **Rationale**: cero regresión para filas viejas (todas con `pagado_hasta = null`); cubre el edge "pagó durante el trial" (al registrar pago se setea pagado_hasta + active, deja el trial atrás).
- **Alternatives**: mezclar trial + pagado (tomar el mayor) → más complejo, sin beneficio real en esta fase.

## D4. `addMonths` y fin de mes

- **Decision**: helper puro `addMonths(date, n)` que clampa al último día válido del mes destino (ej. 31/01 + 1 mes = 28/02). `computeNextPaidUntil(now, current)` = `addMonths(max(now, current ?? now), 1)`.
- **Rationale**: evita overflow (31/01 → 03/03) y "regalar" días en pagos retroactivos.
- **Alternatives**: usar una lib de fechas → innecesario (constitución: sin libs nuevas).

## D5. Config del founder (alias/CBU/WhatsApp)

- **Decision**: centralizar en `src/lib/founder.ts` (`FOUNDER = { whatsapp, alias, cbu, titular }` + `founderWaLink(msg)`). Migrar los usos actuales (hoy el número está duplicado en `PlanStatusBanner`, `RequirePlan`, `HomeContact`, `CommercialFooter`).
- **Rationale**: DRY; un solo lugar para actualizar datos de cobro/contacto del founder.
- **Alternatives**: env vars → innecesario para datos no secretos y que cambian rara vez; tabla config → over-engineering para un solo founder.

## D6. Ubicación de la UI de cobros

- **Decision**: extender `/owner/planes` (`OwnerPlansManager`) con "Registrar pago" + `pagado_hasta` + historial por barbería.
- **Rationale**: ya lista barberías con tier/estado y tiene owner-auth; DRY para Fase 1.
- **Alternatives**: página nueva `/owner/cobros` → se difiere hasta que el módulo crezca (MP en fase futura).
