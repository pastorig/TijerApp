# Specification Quality Checklist: Cuentas para empleados

**Created**: 2026-08-24 · **Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Sin detalles de implementación en el spec
- [x] Centrado en el valor para el usuario
- [x] Lo entiende alguien que no programa
- [x] Secciones obligatorias completas

## Requirement Completeness

- [x] Sin marcadores [NEEDS CLARIFICATION]
- [x] Requisitos verificables
- [x] Criterios de éxito medibles y sin tecnología
- [x] Escenarios de aceptación definidos
- [x] Casos borde identificados
- [x] Alcance acotado (hay sección de lo que queda afuera)
- [x] Supuestos identificados

## Feature Readiness

- [x] Cada requisito tiene criterio de aceptación
- [x] Los escenarios cubren el flujo principal
- [x] No se filtran detalles de implementación

## Notas

Decisiones resueltas con Bautista antes de escribir:

1. **Arquitectura** → superficie aparte, no filtrar el panel por rol. El
   default pasa a ser "no ve nada" en vez de "ve todo salvo que lo tapemos".
2. **Permisos** → ver, confirmar y cancelar los suyos. NO crear turnos.

Quedan dos decisiones **de negocio** anotadas al final del spec (desde qué plan
y si hay tope de accesos). No bloquean el diseño; sí hay que cerrarlas antes de
implementar la parte del dueño.

⚠️ El requisito que manda es **FR-014**: que el empleado no vea algo no puede
depender de que la interfaz se lo esconda. Toda la arquitectura sale de ahí.
