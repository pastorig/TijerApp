# Feature Specification: El plan se chequea al entrar, y el empleado dice por qué cancela

**Feature Branch**: `020-empleado-plan-y-motivo`
**Created**: 2026-08-25
**Status**: Draft

## Resumen

Los dos hallazgos de la auditoría del 25/08 que hacen daño en silencio.

### 1. El plan solo se chequea al invitar

Las cuentas de empleados son de **Esencial y Pro**. Eso se valida cuando el
dueño da el acceso, y en ningún lado más: ninguno de los cuatro endpoints de
`/api/staff/*` mira el plan. Si una barbería baja a Solo, sus empleados siguen
entrando y trabajando con una feature que ya no pagan.

Hoy no muerde —la única barbería con empleados es la demo, en Pro— pero es una
feature paga regalada, y de las que nadie va a notar.

### 2. El empleado cancela sin motivo, y eso ensucia los datos del dueño

Cuando el dueño cancela, pasa por un diálogo que le ofrece un motivo: *no
vino*, *cliente avisó*, *reprogramado*. De ahí sale la detección de **clientes
ghost** en la pantalla de Clientes.

El empleado cancela con un `status: cancelled` pelado. **No es que elija no
poner motivo: no tiene dónde ponerlo.** Y como `isNoShowReason(null)` es
`false`, los clientes que le faltan al empleado **nunca se cuentan como ghost**.
La lista de clientes del dueño empeora sola a medida que el empleado usa la app.

En la base hay 22 turnos cancelados y **cero cancelados por un empleado**: la
feature es nueva y todavía no se rompió nada.

## La decisión que hay que nombrar

**El vencimiento del plan NO puede cortarle la lectura al empleado.** Cuando el
plan vence, la barbería entra en modo lectura: el dueño ve todo y no escribe
nada (feature 009). El empleado tiene que quedar igual.

Por eso el chequeo nuevo mira **solo el tier**, no el vencimiento. Usar
`assertPlanFeature` tal cual habría dejado al empleado sin ver ni su agenda el
día que vence el plan, que es más castigo que el que recibe el dueño. Lo que
frena la escritura ya está: `assertPlanActive` en `appointment-status`.

## User Scenarios & Testing

### La barbería baja a Solo

1. El dueño pasa de Esencial a Solo.
2. Su empleado abre la app y **no entra**: se le explica que la barbería ya no
   tiene el plan que incluye cuentas para empleados.
3. El acceso **no se borra**. Si el dueño vuelve a Esencial, el empleado entra
   como antes, sin que nadie lo re-invite.

### La barbería vence el plan

1. El plan vence y la barbería queda en modo lectura.
2. El empleado **sigue viendo su agenda**, igual que el dueño ve la suya.
3. Al intentar confirmar o cancelar, le dice que el plan venció.

### El empleado cancela un turno

1. Toca cancelar.
2. Se abre **el mismo diálogo que usa el dueño**, con los mismos motivos.
3. Elige "No vino" y confirma.
4. Ese turno cuenta como ghost en la pantalla de Clientes del dueño, igual que
   si lo hubiera cancelado él.

### Casos borde

- **Motivo vacío**: se permite, igual que para el dueño. Lo que se arregla es
  que el empleado *pueda* darlo, no obligarlo a algo que al dueño no se le
  obliga.
- **"Otro" sin texto**: el diálogo ya lo impide, y es el mismo diálogo.
- **Confirmar** no pide motivo: no hay nada que explicar.

## Requisitos

### Funcionales

- **FR-001** `resolveStaffAccess` corta con 403 si el tier de la barbería no
  incluye `cuentas_empleados`. Un solo lugar: los cuatro endpoints pasan por ahí.
- **FR-002** Ese corte mira el **tier**, no el vencimiento: en modo lectura el
  empleado sigue leyendo.
- **FR-003** El acceso no se revoca ni se borra por un cambio de plan.
- **FR-004** `/api/staff/appointment-status` acepta y guarda
  `cancellation_reason` cuando el estado es `cancelled`.
- **FR-005** El motivo se ignora si el estado es `confirmed`: un turno
  confirmado no puede quedar con un motivo de cancelación pegado.
- **FR-006** La agenda del empleado abre el mismo `CancelAppointmentDialog` que
  el panel del dueño. Mismos motivos, mismo texto, misma forma de guardar.

### No funcionales

- **NFR-001** Sin migración: `cancellation_reason` ya existe.
- **NFR-002** El diálogo se **comparte**, no se copia.
- **NFR-003** Verde en `tsc`, `lint`, `test:unit` y `build`.

## Fuera de alcance

- Obligar el motivo. Hoy es opcional para el dueño y queda opcional para los
  dos; hacerlo obligatorio es una decisión de producto aparte.
- Avisarle al cliente que le cancelaron: tampoco pasa cuando cancela el dueño
  (hallazgo 07 de la auditoría), así que es del producto y no de esta sección.
