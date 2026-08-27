# Feature Specification: El empleado carga el turno del que entra sin reservar

**Feature Branch**: `022-empleado-turno-a-mano`
**Created**: 2026-08-26
**Status**: Draft

## Resumen

El que entra a la barbería sin haber reservado es el pan de cada día. Hoy el
empleado no lo puede anotar: le tiene que **pedir al dueño que lo cargue**, o no
queda registrado.

Que no quede registrado no es un detalle de prolijidad. Un turno que no existe
en la app es un horario que sigue figurando libre —se lo puede llevar una
reserva online mientras el barbero está cortando— y es plata que no entra ni en
su comisión ni en los reportes del dueño.

Es la única cosa de la auditoría que un barbero va a pedir por su cuenta.

## Por qué el empleado no puede usar lo que ya existe

El dueño tiene `ManualAppointmentModal`, que guarda **directo contra Supabase**
desde el navegador. El empleado no está en `barbershop_admins`, así que RLS lo
frena: no puede escribir un turno por esa vía, a propósito.

Necesita pasar por el servidor, como todo lo suyo. Y ahí el servidor puede
hacer algo que el modal del dueño no hace: **forzar que el turno sea para él**.
El barbero no se elige, se resuelve del token.

## La quinta casilla, y por qué arranca prendida

Se suma **"Cargar turnos"** a las cuatro que ya existen.

Las otras cuatro arrancan en `true` con un motivo claro: el empleado ya tenía
esas capacidades y quitárselas de golpe habría sido romperle la app. Acá es al
revés — es una capacidad nueva que nadie tenía — así que el default merece
justificarse aparte.

Arranca **prendida** igual. Un barbero anotando en su propia agenda al que
acaba de entrar es exactamente lo que un dueño espera de "que maneje su
agenda"; el riesgo es bajo y se ve en el turnero. Con el default apagado la
función nacería muerta: nadie la descubriría, porque nadie entra a Equipo a
buscar casillas nuevas.

## User Scenarios & Testing

### Entra alguien sin turno

1. El barbero abre su agenda en el día de hoy y toca **Agregar turno**.
2. Elige uno de **sus** servicios, pone el nombre, el horario y guarda.
3. El turno aparece en su lista, en su horario, y el resumen del día se
   actualiza.
4. En el turnero del dueño aparece igual que cualquier otro.

### El horario ya está ocupado

1. Elige un horario donde ya tiene un turno.
2. Le dice que ya hay un turno ahí, sin crear nada duplicado.

### El dueño le saca el permiso

1. Destilda **Cargar turnos** en Equipo.
2. El botón desaparece de la agenda del empleado, y el endpoint rechaza la
   llamada aunque la arme a mano.

### Casos borde

- **Plan vencido**: no puede crear, igual que no puede confirmar ni cancelar.
- **Sin teléfono**: se permite. El que entra de la calle muchas veces no lo
  deja, y exigirlo llevaría a que inventen un número.
- **El turno nace pendiente**, igual que el que carga el dueño, aunque la
  barbería tenga la auto-confirmación prendida.
- **Solo su agenda**: no puede cargarle un turno a un compañero. El
  `barber_id` no viaja en el request.

## Requisitos

### Funcionales

- **FR-001** Quinto permiso `cargarTurno`, default `true`, editable en Equipo
  junto a los otros cuatro.
- **FR-002** `GET /api/staff/services`: los servicios activos **de su barbero**.
- **FR-003** `POST /api/staff/appointment`: crea un turno pendiente para su
  barbero. El `barber_id` sale del token, nunca del request.
- **FR-004** El servicio tiene que ser de su barbero y de esa barbería; si no,
  se rechaza.
- **FR-005** Respeta el modo lectura (`assertPlanActive`) y el permiso.
- **FR-006** Un horario ocupado devuelve un error entendible, no un 500.
- **FR-007** El turno queda `pending` siempre.

### No funcionales

- **NFR-001** Migración aditiva.
- **NFR-002** El modal del empleado es propio y no una copia del que usa el
  dueño: sin selector de barbero, con los servicios ya filtrados y guardando
  contra el servidor. Lo único que compartirían serían dos inputs.
- **NFR-003** Verde en `tsc`, `lint`, `test:unit` y `build`.

## Fuera de alcance

- Elegir el horario de una lista de libres. El modal del dueño tampoco lo hace:
  se escribe el horario y el índice único evita el choque.
- Que el empleado edite o mueva un turno ya cargado.
- Bloquear un horario (franco). Es la otra feature de la lista, aparte.
