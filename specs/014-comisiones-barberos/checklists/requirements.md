# Specification Quality Checklist: Comisiones por barbero

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-30
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

**Iteración 1 — correcciones aplicadas antes de dar por válido el checklist:**

1. *"Sin configurar" vs "0%" era ambiguo.* La primera redacción trataba a un barbero sin
   comisión como 0%. Son cosas distintas y confundirlas tiene consecuencia real: el dueño
   ve $0 y cree que no le debe nada, cuando en verdad nunca configuró el porcentaje. Se
   agregó **FR-002** y el primer edge case.

2. *El redondeo podía no cerrar.* Si se calcula por separado "lo del barbero" y "lo de la
   barbería", con porcentajes como 33% las dos puntas no suman el total y el dueño ve una
   diferencia de pesos que no entiende. Se agregó **FR-004** y la assumption de calcular
   la comisión y obtener lo de la barbería **por resta**.

3. *Faltaba decir qué pasa al cambiar el porcentaje a mitad de período.* Guardar histórico
   por turno es mucho más caro y no es lo que pide una barbería chica. Se decidió aplicar
   el vigente y **avisarlo en pantalla** (FR-103), en vez de dejar al dueño descubriéndolo.

4. *Se acotó el alcance.* Registrar el pago de la comisión, comisiones por servicio y
   comisiones sobre productos quedaron explícitamente afuera: cada una es una feature
   propia y ninguna hace falta para que esto sirva.

**Decisión de alcance registrada:** esta feature **sí lleva migración** (una columna en
`barbers`), a diferencia de la 012 y la 013. No hay forma de derivar el porcentaje de datos
existentes: es información nueva que solo el dueño conoce.

**Sin bloqueos.** Listo para **speckit-plan**.

**A validar durante el plan (decisiones técnicas, no de producto):** dónde vive el cálculo
para que reportes, PDF y el envío por WhatsApp usen la misma fuente y no tres cuentas
parecidas; y cómo se representa "sin configurar" en la base sin que se confunda con 0.
