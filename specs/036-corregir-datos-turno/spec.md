# Specification: Corregir los datos del cliente en un turno

**Branch**: `036-corregir-datos-turno`
**Created**: 2026-10-08
**Status**: Implementado — en preview, esperando el OK de Bautista
**Input**: "en el panel del dueño, en los 3 puntos que se pueda editar el turno, porque me
dijeron que un cliente reservó mal colocando un número erróneo" (Bautista, 8/10/2026).

## Contexto

Un cliente reservó con el teléfono mal escrito. La barbería no tenía cómo arreglarlo: el
turno quedaba con un número al que no se le puede escribir, y el botón de WhatsApp del
turno abría un chat con un desconocido. La única salida era cancelar y cargar el turno de
nuevo, perdiendo el link de confirmación que el cliente ya tenía.

## Qué se puede corregir

Nombre, teléfono, mail y comentario del cliente. Nada más.

**El servicio, el barbero, el día y la hora no se editan acá.** Cambiarlos mueve la agenda
(puede pisar otro turno, cambia la duración y el precio) y eso ya tiene su camino:
arrastrar el turno en el calendario. Mezclarlo en este diálogo era abrir una segunda
puerta, sin las validaciones de la primera.

## Acceptance Scenarios

1. **Given** un turno pendiente o confirmado, **When** el dueño abre los tres puntos,
   **Then** ve "Corregir datos del cliente".
2. **Given** ese diálogo, **When** abre, **Then** trae los datos actuales y "Guardar" está
   apagado hasta que cambie algo.
3. **Given** un teléfono con menos de 8 dígitos, un nombre vacío o un mail mal formado,
   **When** guarda, **Then** no se guarda y dice cuál es el problema.
4. **Given** datos válidos, **When** guarda, **Then** el turno muestra los datos nuevos
   sin recargar y el WhatsApp del turno abre con el número corregido.
5. **Given** un turno cancelado o eliminado, o la barbería en modo lectura, **Then** la
   opción no aparece.
6. **Given** un pedido armado a mano contra el servidor, **When** intenta cambiar el
   servicio, la fecha o un turno de otra barbería, **Then** esos campos se ignoran y el
   turno de otra barbería no se toca.

## Decisiones

- **Las mismas reglas que al reservar**: teléfono de 8 dígitos o más, nombre obligatorio.
  Un dato corregido no puede quedar peor validado que uno recién cargado.
- **La pantalla pinta lo que devuelve el servidor**, no lo que mandó: es lo que quedó
  guardado de verdad.
- **No se le avisa al cliente.** Corregirle el teléfono no es algo que tenga que enterarse.
- **Solo en el panel del dueño** (turnero y hoja del calendario). El empleado no lo tiene:
  no fue pedido y suma un permiso más para decidir.
- **Sin migración**: todas las columnas ya existen.

## Verificación

- Local, a 390 px, con una página de prueba: la opción aparece en los tres puntos, el
  diálogo abre con los datos, rechaza teléfono corto y mail inválido con su mensaje, manda
  exactamente lo editado y la fila muestra los datos nuevos.
- **Sin verificar**: el guardado real contra el servidor (necesita una sesión de dueño).
  Lo prueba Bautista en la preview.
