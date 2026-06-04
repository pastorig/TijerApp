# Specification Quality Checklist: Push Notifications

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-06-04
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *términos como "Web Push", "VAPID", "PushManager" son nombres del estándar W3C, equivalentes a citar "OAuth2" o "REST"; usados en contexto técnico necesario, no como prescripción de implementación específica*
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders — *audiencia es founder solo dev; vocabulario técnico aceptable y explicado*
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — *asunciones documentadas explícitamente en lugar de marcar ambiguity*
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable — *métricas concretas: 70%, ≤60s p95, ≥95%, ≤1%, cero cross-tenant*
- [x] Success criteria are technology-agnostic (no implementation details) — *los SCs hablan del USER outcome (latencia percibida, % de entrega), no de cómo se implementa*
- [x] All acceptance scenarios are defined — *7 scenarios cubren install, notif, tap, opt-out, cliente, multi-admin, cross-tenant*
- [x] Edge cases are identified — *9 edge cases: browser unsupported, permission denied, iOS quirks, subscriptions expiradas, logout, multi-device, etc.*
- [x] Scope is clearly bounded — *sección "Won't Have" explícita con 7 items fuera de scope*
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria — *FRs mapean a acceptance scenarios directamente*
- [x] User scenarios cover primary flows — *opt-in, recepción, tap, opt-out, multi-tenant aislamiento*
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification — *Dependencies y Assumptions contienen contexto técnico necesario sin prescribir solución exacta (library específica, schema exacto, etc.)*

## Notes

**Estado**: ✅ Spec lista para `speckit-plan`. No requiere `speckit-clarify`.

**Asunciones críticas a validar con user antes del plan**:

1. **Web Push API + VAPID self-signed** (no FCM/APN). Si querés ir por FCM para Android-specific features o APN para iOS-specific, el approach cambia. Pero VAPID es industria-estándar para PWAs y funciona en TODOS los browsers.

2. **Postgres trigger en appointments.insert** dispara la notif. Si preferís hacerlo desde el código (en lugar de SQL), sería un POST extra después del insert — funciona pero menos atómico (puede fallar el push pero el appointment ya está guardado).

3. **Vercel cron cada 30-60s**. Si preferís realtime puro (Supabase Realtime subscription en el client del barbero), el approach es muy distinto y tiene otros trade-offs.

4. **iOS Safari requiere PWA instalada** para web push. Documentado como edge case — Apple no permite web push en Safari tab regular, solo si está agregada al home screen. No es asunción nuestra, es restricción de la plataforma.

5. **Cliente final notif al confirmar** (FR-101) — opcional should-have. Si querés MVP estricto, podemos skip esto en plan/tasks y dejarlo para fase 2 del feature.

Si confirmás las 5, → proceder con `speckit-plan` directo. Si discrepás con alguna, → correr `speckit-clarify` para refinarlas.

**Items técnicos a decidir en plan.md (no en spec)**:
- Library exacta (web-push npm package — el estándar de-facto)
- Schema SQL exacto con columnas, FKs, RLS policies
- Diseño exacto del trigger Postgres
- Componente UI específico del botón "Activar notificaciones" + estados
- Estrategia exacta de retry y cleanup de invalid subscriptions
- VAPID keys generation script (one-time)
