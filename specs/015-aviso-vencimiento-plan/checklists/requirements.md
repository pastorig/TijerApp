# Specification Quality Checklist: Aviso de vencimiento del plan

**Purpose**: Validar que el spec esté completo antes de planificar
**Created**: 2026-08-19
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Sin detalles de implementación (lenguajes, frameworks, APIs)
- [x] Centrado en el valor para el usuario
- [x] Escrito para que lo entienda alguien que no programa
- [x] Todas las secciones obligatorias completas

## Requirement Completeness

- [x] No quedan marcadores [NEEDS CLARIFICATION]
- [x] Los requisitos son verificables y sin ambigüedad
- [x] Los criterios de éxito son medibles
- [x] Los criterios de éxito no mencionan tecnología
- [x] Los escenarios de aceptación están definidos
- [x] Los casos borde están identificados
- [x] El alcance está acotado (hay sección de qué queda afuera)
- [x] Dependencias y supuestos identificados

## Feature Readiness

- [x] Cada requisito funcional tiene un criterio claro de aceptación
- [x] Los escenarios cubren el flujo principal
- [x] La feature cumple los criterios de éxito definidos
- [x] No se filtran detalles de implementación al spec

## Notas

Las dos decisiones que normalmente serían [NEEDS CLARIFICATION] se resolvieron
con Bautista antes de escribir el spec:

1. **Canal** → cartel en el panel + notificación al celular. Se descartó el
   email: hoy no hay dirección del administrador guardada.
2. **Cadencia** → dos avisos (al entrar en la ventana y el día del
   vencimiento). Se descartó uno solo (se lo puede perder) y uno por día
   (parece un cobrador golpeando la puerta).

Una tercera decisión salió al escribir el spec y quedó documentada como caso
borde: la ventana es **"3 días o menos"** y no "exactamente 3 días", porque si
no, una barbería que ya está a 2 días cuando la feature se activa nunca
recibiría el primer aviso. Es exactamente el caso de `leocuts`.
