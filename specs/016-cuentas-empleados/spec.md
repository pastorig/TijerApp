# Feature Specification: Cuentas para empleados

**Feature Branch**: `016-cuentas-empleados`
**Created**: 2026-08-24
**Status**: Draft

## Resumen

Hoy cada barbería tiene **una sola cuenta**. Verificado contra la base: las 7
barberías tienen exactamente un admin, incluida la de Santi, que tiene 5
barberos cargados. O sea que el empleado que usa la app lo hace **con la
contraseña del dueño** — y desde ahí ve la facturación, la lista completa de
clientes y la configuración de cobros, y puede cambiarlas.

Un barbero pidió que su empleado pueda entrar y ver **solo su agenda y su
comisión**. Esta feature le da al empleado su propia cuenta, con acceso a dos
cosas: los turnos que tiene asignados (para confirmarlos o cancelarlos) y lo
que va ganando según su comisión.

No es "limitarle permisos al empleado": hoy el empleado no tiene permisos de
más, **no tiene cuenta**. Es dejar de obligarlos a compartir una contraseña.

## User Scenarios & Testing

### El dueño invita a su empleado

1. El dueño entra a Equipo y elige un barbero de su barbería.
2. Toca "Darle acceso" y escribe el email del empleado.
3. El empleado recibe un mail, define su contraseña y entra.
4. Desde ese momento el empleado ve su agenda y su comisión, nada más.

### El día del empleado

1. Entra y ve **sus** turnos del día, en orden.
2. Un cliente avisa que no viene: lo cancela.
3. Otro confirma por WhatsApp: lo marca confirmado.
4. En la otra pestaña ve cuánto lleva ganado en el mes según su comisión.

### El empleado se va de la barbería

1. El dueño entra a Equipo y le quita el acceso.
2. El empleado deja de poder entrar de inmediato.
3. Los turnos que atendió y las comisiones que generó **no se tocan**: el
   historial de la barbería queda intacto.

### Casos borde

- **El dueño no le configuró comisión al barbero**: la pantalla de ganancias lo
  dice con todas las letras ("tu comisión todavía no está configurada, hablalo
  con el dueño"), y no muestra $0 como si hubiera ganado cero.
- **El empleado intenta entrar a una pantalla del dueño** escribiendo la URL:
  no entra.
- **El empleado quiere cancelar el turno de otro barbero**: no lo ve, y si lo
  intenta por la vía que sea, no puede.
- **La barbería queda con el plan vencido**: el empleado entra en modo lectura,
  igual que el dueño.
- **Un mismo email para dos barberías** (alguien que trabaja en dos locales):
  cada acceso es independiente.
- **El dueño intenta darse acceso a sí mismo como empleado**: no tiene sentido,
  ya ve todo.

## Requirements

### Functional Requirements

**Acceso**

- **FR-001**: El dueño puede darle acceso a un barbero de su barbería
  indicando un email.
- **FR-002**: El empleado define su propia contraseña; el dueño nunca la ve ni
  la elige.
- **FR-003**: El dueño puede quitarle el acceso en cualquier momento, y el
  efecto es inmediato.
- **FR-004**: Quitar el acceso **no borra ni altera** turnos, clientes ni
  comisiones ya generadas.
- **FR-005**: Cada acceso queda atado a **un barbero concreto** de una
  barbería concreta.

**Lo que ve el empleado**

- **FR-006**: Ve los turnos que tiene asignados, y **solamente** esos.
- **FR-007**: De cada turno ve lo necesario para atender: cliente, servicio,
  horario, duración, comentario y estado.
- **FR-008**: Puede confirmar y cancelar sus turnos.
- **FR-009**: **No** puede crear turnos nuevos.
- **FR-010**: Ve cuánto lleva ganado por comisión en el período, con el mismo
  número que ve el dueño en su liquidación.
- **FR-011**: Puede ver períodos anteriores.

**Lo que NO ve el empleado**

- **FR-012**: No accede a la facturación de la barbería, la lista de clientes,
  el cierre de caja, los reportes, la configuración, los cobros, la
  fidelización, los cupones, la galería ni el equipo.
- **FR-013**: No accede a los turnos de otros barberos.
- **FR-014**: Que el empleado no tenga acceso **no depende de que la interfaz
  se lo esconda**: aunque llegue por otra vía, no obtiene la información.

**Registro**

- **FR-015**: De cada confirmación o cancelación queda registrado **quién** la
  hizo y cuándo.
- **FR-016**: El dueño puede ver ese registro en el turno.

**Plan**

- **FR-017**: La cantidad de accesos de empleados **no** consume el cupo de
  cuentas de dueño del plan.
- **FR-018**: Con el plan vencido, el empleado entra en modo lectura, igual que
  el dueño.

### Key Entities

- **Acceso de empleado**: vincula una persona (por su cuenta) con **un barbero**
  de **una barbería**. Se puede revocar. Guarda quién lo otorgó y cuándo.

## Success Criteria

- **SC-001**: Un empleado con acceso ve su día y puede confirmar o cancelar sin
  pedirle nada al dueño.
- **SC-002**: Un empleado no puede obtener ni un dato de facturación, ni un
  teléfono de un cliente que no sea de sus propios turnos, por ninguna vía.
- **SC-003**: La comisión que ve el empleado coincide **exactamente** con la
  que ve el dueño para ese mismo período.
- **SC-004**: Revocado el acceso, el empleado no puede entrar, y el historial
  de la barbería queda completo.
- **SC-005**: El dueño puede saber quién canceló un turno.
- **SC-006**: Ninguna barbería tiene que compartir la contraseña del dueño para
  que un empleado use la app.

## Assumptions

- El empleado ya existe como barbero cargado en la barbería: el acceso se le da
  a alguien que ya está en el equipo.
- Un barbero tiene como mucho un acceso: no hay dos personas manejando la misma
  agenda.
- El empleado usa el celular. La pantalla se piensa para eso.
- La comisión se calcula con lo que ya existe (feature 014): se muestra, no se
  recalcula distinto.

## Out of Scope

- Que el empleado cargue turnos nuevos.
- Que el empleado edite sus horarios, sus servicios o sus precios.
- Niveles intermedios de permisos (recepcionista, encargado): hoy hay dueño y
  empleado, nada más.
- Que el empleado vea la comisión de otros.
- Liquidar o pagarle al empleado desde la app.

## Decisiones cerradas (Bautista, 24/08/2026)

1. **Disponible desde Esencial.** En Solo el tope es de 1 barbero, así que no
   hay empleado a quien invitar: la feature se habilita sola donde tiene
   sentido y le suma valor a Esencial, que hoy tiene poco diferencial.
2. **Un acceso por barbero cargado, sin tope aparte.** No consume el cupo de
   cuentas de dueño. El valor está en que el dueño duerma tranquilo, no en
   cobrar por asiento.
