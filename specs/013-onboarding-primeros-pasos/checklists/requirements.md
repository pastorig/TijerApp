# Specification Quality Checklist: Onboarding optimizado — "Primeros pasos"

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-29
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

1. *"Guía de onboarding" era demasiado vago para ser testeable.* La primera redacción
   pedía "guiar al barbero" sin decir hasta dónde. Se ancló el alcance en un resultado
   concreto y verificable: la guía termina cuando el barbero **tiene su link público a mano
   para compartir** (FR-007, FR-008), que es el momento en que el producto empieza a
   funcionar de verdad.

2. *Riesgo de un requisito trampa: "el dato existe" ≠ "el barbero lo revisó".* Como el
   registro ya deja un servicio y un horario cargados, una guía ingenua los daría por
   completados y el barbero terminaría compartiendo su barbería con un "Corte" a $10.000
   que no es su precio. Se agregó **FR-006**: el paso se cumple cuando el valor **cambió
   respecto del que dejó el registro**.

3. *Faltaba el caso de las barberías que ya existen.* Sin eso, al desplegar la feature
   todas las barberías vivas verían una guía llena de pasos pendientes. Se agregaron
   FR-010 y el escenario 7.

4. *Faltaba el cruce con modo lectura.* Una barbería con el plan vencido no puede
   configurar nada; la guía no puede invitar a acciones que van a fallar (FR-011).

5. *Se eliminó la sección "Key Entities".* La feature no introduce modelos de datos — el
   avance se deriva de datos que ya existen.

**Decisión de alcance registrada:** la feature es **sin migración**. El avance se calcula
del estado real y la preferencia de ocultar la guía es de visualización, no del negocio.
Además de evitar una migración, esto hace imposible que el avance mostrado se
desincronice de la configuración real de la barbería.

**Sin bloqueos.** El spec queda listo para **speckit-plan**.

**A validar durante el plan (decisiones técnicas, no de producto):** de dónde salen los
datos de cada paso sin sumar consultas caras al Dashboard, y cómo se detecta "sigue en el
valor por defecto" sin quedar atado a constantes duplicadas entre el registro y la guía.
