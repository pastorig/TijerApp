# Specification Quality Checklist: Excepción de horario por rango de días

**Purpose**: Validar que la spec esté completa y sana antes de planificar
**Created**: 2026-09-06
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Sin detalles de implementación (lenguajes, frameworks, APIs)
- [x] Centrada en el valor para el usuario y la necesidad del negocio
- [x] Escrita para que la entienda alguien que no programa
- [x] Todas las secciones obligatorias completas

## Requirement Completeness

- [ ] No quedan marcadores [NEEDS CLARIFICATION] — **quedan 2 preguntas abiertas (Q1 y Q2), con opción sugerida en las dos**
- [x] Los requisitos son testeables y sin ambigüedad
- [x] Los criterios de éxito son medibles
- [x] Los criterios de éxito no hablan de implementación
- [x] Los escenarios de aceptación están definidos
- [x] Los casos borde están identificados
- [x] El alcance está acotado (hay sección de lo que queda afuera)
- [x] Dependencias y supuestos identificados

## Feature Readiness

- [x] Cada requisito funcional tiene un criterio de aceptación claro
- [x] Los escenarios cubren los flujos principales
- [x] La feature cumple los resultados medibles de Success Criteria
- [x] No se filtran detalles de implementación

## Notas

**Lo que hace a esta feature riesgosa** es que toca el cálculo de horarios, que ya dio dos bugs en producción esta semana (el reloj del servidor en UTC y el cartel que inventaba la causa del rechazo). Por eso la spec incluye una sección de **Precedencia** explícita: cada capa hace una sola cosa y el orden está escrito. Si al planificar aparece una regla que no entra en esas cinco capas, es señal de que algo se está mezclando.

**El arreglo de la pausa (FR-004) no es opcional.** Sin él, esta feature empeora las cosas: hoy la excepción se carga de a un día y desde un aviso puntual; con una pantalla propia para cargar semanas enteras, el almuerzo abierto a reservas pasaría de un caso raro a algo cotidiano. Está verificado en producción: el 30 y el 31 de julio, un barbero con pausa de 13:00 a 16:00 quedó con esas tres horas ofrecidas.

**Q1 y Q2 no bloquean la planificación** de la mayor parte del trabajo; sí definen el comportamiento al guardar y la forma de la pantalla. Conviene responderlas antes de escribir la UI.
