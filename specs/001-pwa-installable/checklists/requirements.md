# Specification Quality Checklist: PWA Instalable

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-06-03
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *términos como "service worker" y "manifest" son inherentes al concepto PWA; usados solo en contexto, no como prescripción tech*
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders — *audiencia es founder solo dev; vocabulario técnico aceptable*
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — *asunciones documentadas explícitamente en lugar de marcar ambiguity*
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details) — *SC-004 menciona Lighthouse como benchmark estándar de industria, equivalente a citar GDPR*
- [x] All acceptance scenarios are defined — *6 scenarios cubren barbero install, cliente install, offline, iOS Safari, re-engagement*
- [x] Edge cases are identified — *6 edge cases identificados*
- [x] Scope is clearly bounded — *sección "Won't Have" explícita con 6 items fuera de scope*
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows — *barbero, cliente final, offline, re-install*
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification — *Dependencies y Assumptions contienen contexto técnico necesario sin prescribir solución*

## Notes

**Estado**: ✅ Spec lista para `speckit-plan`. No requiere `speckit-clarify`.

**Asunciones críticas a validar con user antes del plan**:

1. **Multi-tenant routing**: una sola PWA "TijerApp" con last-context routing (no PWAs separados por barbería). Si el user prefiere PWAs per-tenant, hay que rehacer el approach.
2. **Offline scope**: solo fallback page, sin offline operativo. Si el user quiere reservas offline (caching de turnos del día), es scope mucho más grande.
3. **Install prompt UI**: combinación de nativo + custom. Si el user prefiere solo nativo o solo custom, se ajusta acá.

Si el user confirma estas 3 asunciones, → proceder con `speckit-plan` directo.
Si discrepa con alguna, → correr `speckit-clarify` para refinarlas.

**Items técnicos a decidir en plan.md (no en spec)**:
- Library de service worker (`next-pwa` vs `@serwist/next` vs custom).
- Estrategia exacta de cache (qué se cachea, qué no).
- Cómo se generan los icons PNG desde el SVG (build-time script vs CDN dinámico).
- Cómo se preserva el "last context" (cookie, localStorage, URL hash).
