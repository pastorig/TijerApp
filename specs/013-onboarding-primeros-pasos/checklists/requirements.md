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

---

## Cobertura tras la implementación (2026-07-29)

Las dos incógnitas que quedaban se resolvieron en `research.md` (R1 y R2) y se
implementaron: los datos salen del prop que el Dashboard ya recibe (cero consultas nuevas) y
los defaults se mudaron a `src/lib/onboarding-defaults.ts` como única fuente de verdad.

| FR | Estado | Cómo se verificó |
|---|---|---|
| FR-001 guía visible sin buscarla | ✅ código | Montada arriba de las métricas en el Dashboard |
| FR-002 avance del estado real | ✅ verificado | 29 tests + chequeo contra las 5 barberías vivas |
| FR-003 los 4 pasos mínimos | ✅ código | 6 pasos: 3 obligatorios + logo, prueba, compartir |
| FR-004 un toque a la pantalla | ✅ código | Cada paso pendiente es un `Link` |
| FR-005 pendiente vs cumplido | ✅ código | Ícono/tachado + dorado vs `--success` |
| FR-006 cambió ≠ existe | ✅ **verificado** | Caso trampa y variantes en los tests |
| FR-007 link listo para compartir | ✅ código | Copiar + `whatsAppShareLink` |
| FR-008 colapsa al terminar | ✅ código | Variante "terminada" del componente |
| FR-009 ocultar y reabrir | ✅ código | `localStorage` por slug |
| FR-010 barberías ya configuradas | ✅ **verificado** | `sv-barber` y `popesbarber` dan 3/3 |
| FR-011 plan vencido sin accesos | ✅ código | `useIsReadOnly()` |
| FR-012 cómoda en celular | ⏳ pendiente | No se pudo mirar: la guía está detrás del login |
| SC-006 verde y sin migración | ✅ verificado | tsc + lint + build + 104 casos; cero migraciones |

**Desvío registrado:** todo lo que es aspecto e interacción (FR-012 incluido) quedó sin
verificar porque el navegador headless de la sesión no puede loguearse al admin. El detalle
y los 7 puntos a mirar están en `tasks.md` → "Estado de verificación".
