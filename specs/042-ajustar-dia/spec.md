# Specification: Ajustar el día desde el Turnero

**Branch**: `042-ajustar-dia`
**Created**: 2026-11-24
**Status**: En curso
**Input**: Bautista (24/11/2026): "botón de horarios distinto por el día o bloqueo de hora más accesible
y poder editar con un botón estas 2 cosas de manera accesible".

## Antes

| Qué | Dónde estaba |
|---|---|
| Horario distinto un día (excepción) | Barberos → ficha → Horarios. Lejos del Turnero |
| Bloquear una hora | Botón chico "Bloquear hora" en el calendario del Turnero; solo crea |
| Editar o quitar un bloqueo | No había forma desde el Turnero |

## Qué cambia

Un solo botón **"Horario y bloqueos"** en el calendario del Turnero (donde estaba "Bloquear hora") abre
una ventana para el día elegido y un barbero:

1. **Horario de este día**: Normal (el de la semana, se muestra) · Distinto (desde / hasta) ·
   No trabaja. Guardar escribe o borra la excepción del día (la misma tabla que Barberos → Horarios).
2. **Horarios bloqueados**: la lista de los bloqueos de ese día con **Editar** (desde, hasta, motivo)
   y **Quitar**; y **Bloquear un horario** para sumar uno.

El calendario se redibuja al cerrar. En la compu y en el celular es la misma ventana (`Ventana`).

## Fuera de alcance

- Excepciones de varios días seguidos (siguen en Barberos → Horarios, feature 030).
- La agenda del empleado (tiene su propio bloqueo, feature 023).

## Dónde está

- `src/components/admin/AjustarDiaVentana.tsx` + `src/lib/ajustar-dia.ts` (+ `scripts/test-ajustar-dia.ts`).
- `AgendaCalendar.tsx` (el botón) y `AdminAppointments.tsx` (abre la ventana y recarga el día).
