# Research — Excepción de horario por rango de días

## Lo que ya existe (y no hay que volver a construir)

- **Tabla `barber_day_overrides`**: `barber_id`, `override_date`, `start_time`, `end_time`, `is_working`, `deleted_at`. Unique `(barber_id, override_date)` y RLS por barbería ya resueltas.
- **`upsertDayOverrideForBarber`** hace upsert con `onConflict: "barber_id,override_date"`. Reemplazar una excepción existente ya funciona.
- **El motor de disponibilidad ya lee la excepción** y le da prioridad sobre la regla semanal, tanto en el navegador (`getBarberDayAvailability`) como en el servidor (`getServerAvailability`).
- **Se usa en producción**: 16 excepciones cargadas, casi todas de Santiago Vargas, desde el aviso "extender cierre" del turnero.

O sea: el modelo y el motor están. Falta **la puerta para cargarlas a propósito** y **arreglar la pausa**.

## Decisión 1 — La pausa del mediodía se hereda, y se puede pisar

**Decisión**: al resolver el día, si la excepción no define pausa propia, se toma la de la regla semanal de ese día. Se agregan `break_start`, `break_end` (nullable) y `hereda_pausa boolean not null default true` a `barber_day_overrides`.

- `hereda_pausa = true` → se usa la pausa de la regla semanal (comportamiento por defecto y arreglo del bug para las filas que ya existen).
- `hereda_pausa = false` → se usa `break_start`/`break_end` de la excepción; con los dos en null, **ese día no hay pausa**.

**Razón**: hoy el motor arma el día con `breakStart/breakEnd = null` cuando hay excepción, y el comentario del código lo llama "caso edge raro". No lo es: 5 de los barberos en producción tienen pausa configurada, y ya pegó dos veces — el 30 y el 31 de julio un barbero con pausa de 13:00 a 16:00 quedó con esas tres horas abiertas a reservas. Con una pantalla para cargar semanas enteras, eso pasaría de raro a cotidiano.

Hace falta el booleano y no alcanza con "null = sin pausa" porque hay **tres** estados y dos valores no los cubren: heredar, pausa propia, y sin pausa.

**Alternativas descartadas**:
- *Heredar siempre, sin poder pisarla*: más simple, pero el caso real de las horas extra suele venir con "esos días no paro a comer".
- *Copiar la pausa a la fila al crearla*: se desincroniza en silencio si después cambia la regla semanal.

## Decisión 2 — El rango es de la pantalla, no de la base

**Decisión**: se guarda **una fila por fecha**. El "desde–hasta" es cómo se carga, no cómo se guarda.

**Razón**: si se guardaran rangos habría que resolver solapamientos entre ellos cada vez que se calcula un día, y ahí es donde nacen los bugs difíciles de ver. Con una fila por fecha, la pregunta "¿qué rige el 17?" tiene una sola respuesta y borrar un día del medio es trivial. La tabla ya tiene esta forma y el unique por `(barber_id, override_date)` la garantiza.

## Decisión 3 — Una sola función decide cómo es el día

**Decisión**: extraer `resolverJornadaDelDia()` — pura, testeable — que recibe la fecha, la regla semanal, la excepción y el horario de la barbería, y devuelve `{ trabaja, inicio, fin, pausa }`. La usan el motor del navegador y el del servidor.

**Razón**: es lo que pidió Bautista — "separalo bien para que no haya bugs de horario". Hoy esa resolución está escrita inline dentro de `buildAvailabilitySlots`, mezclada con el armado de la grilla y el filtrado de ocupados. Con una función propia, la precedencia de la spec queda en un solo lugar y se puede testear sin construir una agenda entera.

Esta semana ya salieron dos bugs de horario en producción: el servidor midiendo con el reloj de Vercel en UTC, y el cartel que traducía cualquier rechazo a "alguien te lo ganó de mano". Los dos vivían en código que hacía dos cosas a la vez.

## Decisión 4 — No se abren días libres sin pedirlo

**Decisión**: la excepción se aplica solo a los días del rango en los que el barbero ya trabaja. Un tilde aparte, apagado por defecto, permite abrir también los días libres.

**Razón**: abrir un domingo sin querer es el error más caro. El cliente reserva, el barbero no aparece, y para el cliente la que falló es la app.

## Decisión 5 — El aviso de turnos afuera no bloquea

**Decisión**: antes de guardar se listan los turnos que quedarían fuera de la jornada nueva (cliente y hora) y se deja guardar igual. Ningún turno se cancela, se mueve ni se altera.

**Razón**: es como se comporta hoy el resto del sistema cuando un turno se pasa del cierre. Y quien se marca un día libre suele estar apurado: obligarlo a reprogramar primero lo traba justo cuando menos puede.

## Decisión 6 — La hora es la de la barbería

**Decisión**: "hoy" —para no dejar cargar excepciones en el pasado— sale de `ahoraEnArgentina()`.

**Razón**: `new Date()` devuelve la hora de donde corre el código; en Vercel es UTC, tres horas adelante. Ese fue el bug del 04/09, donde el servidor rechazaba turnos que la pantalla mostraba libres. El módulo ya existe; hay que usarlo y no volver a `getHours()` pelado.

## Decisión 7 — Sin endpoint nuevo

**Decisión**: la pantalla escribe con el cliente de Supabase del navegador, como ya hacen los bloqueos y la regla semanal. La RLS de `barber_day_overrides` ya exige `current_user_has_barbershop_access`.

**Razón**: no hay nada que el servidor tenga que resolver con secretos ni validación que el cliente pueda saltear con consecuencias — el motor del servidor **lee** las excepciones al validar una reserva, así que una excepción falsa no abre ningún turno que el servidor no acepte. Agregar una ruta sería ceremonia sin garantía nueva.

**Ojo**: esto vale porque el servidor recalcula la disponibilidad al reservar. Si esa validación se sacara, esta decisión hay que revisarla.
