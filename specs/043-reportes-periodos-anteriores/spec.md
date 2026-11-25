# Specification: Reportes de períodos anteriores

**Branch**: `043-reportes-periodos-anteriores`
**Created**: 2026-11-25
**Status**: En curso
**Input**: Bautista (25/11/2026): "en los reportes, poder colocar el mes o semana que desees, porque si
querés ver el mes anterior no deja".

## Antes

Reportes tiene tres botones: **Hoy · Esta semana · Este mes**, siempre contados hasta hoy y
comparados contra la misma cantidad de días del período anterior (`report-ranges.ts`). No hay forma
de mirar octubre cuando ya es noviembre, ni la semana pasada. El dueño que cierra el mes o liquida a
un barbero el día 1 se queda sin el número del mes que terminó.

## User Scenarios & Testing

### Historia principal

El dueño entra a Reportes el 1 de diciembre, toca **Mes** y después **‹**: ve noviembre completo
(turnos, ingresos, ranking de barberos, liquidaciones), comparado contra octubre completo, y lo baja
en PDF.

### Escenarios de aceptación

1. **Dado** que hoy es 25/11, **cuando** el dueño está en Mes y toca ‹, **entonces** ve "Octubre 2026"
   con los turnos del 1 al 31/10 y la comparación es contra septiembre completo (1 al 30/09).
2. **Dado** que está mirando octubre, **cuando** toca ›, **entonces** vuelve a "Noviembre 2026" (el mes
   en curso, contado hasta hoy, como hasta ahora).
3. **Dado** que está en el período actual, **entonces** la flecha › está apagada: no se puede ir al
   futuro.
4. **Dado** que está en Semana, **cuando** toca ‹, **entonces** ve la semana anterior de lunes a domingo,
   comparada contra la semana de antes.
5. **Dado** que está en Hoy, **cuando** toca ‹, **entonces** ve ayer, comparado contra anteayer.
6. **Dado** que está mirando octubre y cambia a Semana, **entonces** vuelve a la semana actual: cambiar
   el tipo de período arranca siempre desde el actual.
7. **Dado** que está mirando octubre, **cuando** exporta el PDF o manda la liquidación a un barbero por
   WhatsApp, **entonces** ambos dicen "octubre 2026" y usan los números de octubre.
8. **Dado** que está mirando octubre con un barbero filtrado, **entonces** el filtro se mantiene al
   moverse entre períodos.

### Casos borde

- **Mes anterior más corto:** el 31 de marzo, el mes en curso se sigue comparando con los mismos días
  del mes anterior, recortado al último día de febrero (como hoy).
- **Antes del primer turno de la barbería:** se puede seguir yendo para atrás; el período se ve vacío
  con el estado vacío de siempre. Tope: 24 meses hacia atrás, para no navegar sin fin.
- **Semana que cruza meses** (lunes 27/10 a domingo 02/11): se muestra como "27 oct – 2 nov".
- **La semana en curso** sigue cortada en hoy; una semana pasada se cuenta de lunes a domingo.

## Requirements

### Functional

- **FR-001**: Reportes MUST mostrar, debajo de Hoy · Semana · Mes, una fila con ‹, el nombre del período
  que se está mirando y ›.
- **FR-002**: ‹ MUST llevar al período anterior del mismo tipo (día, semana de lunes a domingo, o mes
  calendario).
- **FR-003**: › MUST llevar al período siguiente y MUST estar deshabilitada en el período en curso.
- **FR-004**: Un período ya terminado MUST contarse entero; el período en curso MUST contarse hasta hoy
  (regla de siempre: un reporte mira lo que ya pasó).
- **FR-005**: La comparación "vs anterior" MUST ser contra el período anterior del mismo tipo:
  - si el período ya terminó, contra el anterior completo;
  - si está en curso, contra la misma cantidad de días del anterior (como hoy).
- **FR-006**: Al cambiar entre Hoy, Semana y Mes, la vista MUST volver al período en curso.
- **FR-007**: El nombre del período MUST ser legible para un dueño:
  - "Hoy" / "Ayer" / "lunes 24/11";
  - "Esta semana" / "Semana pasada" / "17 – 23 nov";
  - "Este mes" / "Octubre 2026".
- **FR-008**: El PDF y el texto de la liquidación por WhatsApp MUST usar el período elegido y su nombre.
- **FR-009**: El filtro por barbero MUST mantenerse al moverse entre períodos.
- **FR-010**: En el celular (< 768 px), la fila de flechas MUST tener botones de al menos 44 px y el
  material de vidrio de la feature 041. En la compu, el mismo control con el estilo del panel de
  escritorio.
- **FR-011**: No se MUST poder ir más de 24 meses para atrás.

### Key Entities

- **Período mirado**: tipo (día / semana / mes) + desplazamiento hacia atrás desde el actual
  (0 = en curso). De ahí salen el rango que se cuenta, el rango con el que se compara y el nombre.

## Success Criteria

- **SC-001**: Un dueño ve el mes anterior completo con 2 toques desde Reportes (Mes → ‹).
- **SC-002**: Los totales de un mes cerrado coinciden con la suma de sus días cerrados uno por uno
  (sin días de más ni de menos), verificado con pruebas de los rangos.
- **SC-003**: El período en curso muestra exactamente los mismos números que antes de esta feature.
- **SC-004**: A 390 px no hay ningún control tapado ni desborde horizontal en Reportes.

## Fuera de alcance

- Rango libre "desde / hasta" (se suma un "Personalizado" si alguien lo pide).
- Elegir el mes en un calendario o lista desplegable: se navega con flechas.
- Traer de la base solo el rango mirado. Hoy la pantalla ya carga todos los turnos de la barbería y
  eso alcanza; queda anotado como mejora para cuando las barberías tengan años de historia.
- La agenda del empleado (su pestaña Ganancias tiene su propio período).

## Assumptions

- La semana arranca el lunes (como hoy en Reportes).
- Días, semanas y meses se calculan en hora de Argentina (como hoy).
- No hace falta migración: los turnos ya llegan todos a la pantalla.
- Es una sola tanda, con capturas a 390 px y en la compu antes de mergear.
