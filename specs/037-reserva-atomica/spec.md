# Specification: Reserva a prueba de choques

**Branch**: `037-reserva-atomica`
**Created**: 2026-10-08
**Status**: Implementado — esperando la migración y la verificación en preview
**Input**: "hacer lo de reserva a prueba de choques" (Bautista, 8/10/2026).

## Contexto

La reserva pública hace dos cosas separadas: pregunta "¿este horario está libre?" y después
guarda el turno. Entre una y otra pasan unos milisegundos. Dos clientes reservando al mismo
tiempo pueden pasar los dos el chequeo.

El índice único de la base frena el caso de **la misma hora de inicio**. No frena dos turnos
que se pisan con horas distintas, y eso pasa cuando se cruzan dos servicios de distinta
duración, porque cada uno tiene su propia grilla de horarios.

### Reproducido en producción (8/10/2026, barbería demo)

Tres reservas disparadas a la vez para el mismo barbero y el mismo día:

| Pedido | Resultado |
|---|---|
| Corte + Barba (45 min) a las 9:00 | reservado |
| Barba (20 min) a las 9:20 | reservado |
| Barba (20 min) a las 9:40 | reservado |

Quedaron **tres turnos activos y dos pares pisados**: el de 45 minutos termina 9:45 y los
otros dos empiezan antes. En la corrida anterior, dos de tres. Con tráfico real esto necesita
que dos personas reserven en el mismo instante; es raro, pero cuando pasa el barbero se
encuentra con dos clientes a la misma hora y no hay nada que lo avise.

## Qué cambia

El chequeo y el guardado pasan a ser **un solo paso** dentro de la base, con un candado por
barbero y día: el segundo pedido espera a que termine el primero y, cuando le toca, vuelve a
mirar la agenda y ya ve el turno del otro.

## Acceptance Scenarios

1. **Given** dos clientes que reservan a la vez horarios que se pisan para el mismo barbero,
   **When** llegan los dos pedidos, **Then** entra uno solo y el otro recibe "ese horario
   acaba de ocuparse".
2. **Given** dos clientes que reservan a la vez horarios que NO se pisan, **Then** entran los
   dos.
3. **Given** dos clientes que reservan a la vez con barberos distintos, **Then** ninguno
   espera al otro.
4. **Given** un turno que el barbero alargó (duración real mayor a la del servicio), **When**
   alguien reserva dentro de ese tiempo de más, **Then** se rechaza.
5. **Given** la migración sin correr, **When** alguien reserva, **Then** la reserva funciona
   como hoy (sin la protección nueva).
6. **Given** una reserva normal, sin nadie compitiendo, **Then** tarda lo mismo que antes.

## Decisiones

- **El candado es por (barbería, barbero, día)**, no por horario: dos turnos que se pisan
  pueden tener horas de inicio distintas, así que un candado por hora no los vería.
- **Dentro del candado se mira solo la superposición con otros turnos.** El horario del
  barbero, sus pausas, bloqueos y la anticipación mínima los sigue validando el servidor antes:
  no cambian en milisegundos, no hay carrera que cubrir, y duplicar esa lógica en SQL abriría
  la puerta a que las dos versiones discrepen.
- **Misma regla de duración que el resto del sistema**: un turno ocupa el mayor entre la
  duración del servicio y la real.
- **El rechazo usa el mismo código de error que el índice único** (23505). El servidor ya lo
  traduce al mensaje correcto y no hubo que tocar nada más.
- **Si la función no existe, se guarda por el camino anterior.** La reserva no puede dejar de
  andar por una migración pendiente.

## Fuera de alcance

- El turno cargado a mano por el dueño, el del empleado, mover un turno en el calendario y
  reprogramar desde el link del cliente. Ahí el que carga está mirando la agenda y los
  sobreturnos son a propósito. Si alguno muestra el mismo problema, se suma después.

## Verificación

- Script `carrera` (fuera del repo): dispara reservas que se pisan, todas a la vez, contra la
  demo, cuenta cuántas entraron y revisa la agenda. **Antes del arreglo: 2 o 3 de 3 entran y
  quedan pisados.** Después de la migración tiene que entrar 1.
