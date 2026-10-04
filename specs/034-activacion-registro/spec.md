# Specification: Activación de barberías recién registradas

**Branch**: `034-activacion-registro`
**Created**: 2026-10-04
**Status**: Draft
**Input**: "seguí con activar a los que se registran" (Bautista, 4/10/2026).

## Contexto

De las 9 barberías registradas, 5 no tienen movimiento. Miradas una por una (4/10/2026):

| Barbería | Registrada | Configuró | Turnos | Último ingreso del dueño |
|---|---|---|---|---|
| Grado | 03/08 | servicio, horario, logo | 0 | 03/08 (el mismo día) |
| Barber Uri | 28/08 | servicio, horario | 0 | 28/08 (el mismo día) |
| Focus | 16/09 | servicios, horario, dirección | 0 | 16/09 (el mismo día) |

Las tres hicieron lo mismo: se registraron, dejaron la barbería configurada, **entraron una
sola vez y no volvieron**. No se trabaron en la configuración —la terminaron—; lo que nunca
pasó es que un cliente reservara, porque nadie compartió el link. Y TijerApp no les volvió
a hablar: al registrarse, el único mail que sale es el aviso interno para el fundador. Al
barbero no le llega nada.

La guía de "Primeros pasos" del panel (013) no los alcanza: vive dentro de un panel que no
vuelven a abrir. Hay que ir a buscarlos afuera, y darles hecho lo único que falta:
**poner el link delante de sus clientes**.

## User Scenarios & Testing

### Primary User Story

Un barbero se registra un martes a la noche. Al minuto tiene un mail con su link y qué
hacer con él. Al otro día, como todavía no entró ningún turno, le llega otro con el texto
listo para pegar en la bio de Instagram y un cartel con QR para imprimir y pegar en el
espejo. Si a los tres días sigue en cero, le llega un tercero —y al fundador un aviso para
que le escriba por WhatsApp—. En cuanto entra el primer turno, los mails se cortan solos.

### Acceptance Scenarios

1. **Given** un barbero que termina de registrarse, **When** se crea su barbería, **Then**
   recibe un mail de bienvenida con su link público, el acceso al panel y el paso
   siguiente, sin demorar la respuesta del registro.
2. **Given** una barbería con 1 día de registrada y 0 turnos, **When** son entre las 10 y
   las 13, **Then** el dueño recibe el mail "compartí tu link" con el texto para la bio y
   el acceso al cartel.
3. **Given** una barbería con 3 días y 0 turnos, **When** llega la ventana, **Then** el
   dueño recibe el segundo mail, y el fundador recibe un aviso con el WhatsApp del dueño.
4. **Given** una barbería con 7 días y 0 turnos, **When** llega la ventana, **Then** el
   dueño recibe el último mail, que le dice cuántos días de prueba le quedan y le ofrece
   ayuda directa.
5. **Given** una barbería que ya recibió su primer turno, **When** corre el envío,
   **Then** no recibe ningún mail más de esta serie.
6. **Given** una barbería registrada hace más de 14 días o con la prueba vencida,
   **When** corre el envío, **Then** no recibe nada de esta serie.
7. **Given** el envío no corrió durante dos días, **When** vuelve a correr con la barbería
   en su día 4, **Then** recibe solo el mail del día 3, no el del día 1 y el 3 juntos.
8. **Given** un dueño en su panel, **When** entra a "Compartir", **Then** ve su link, un
   código QR que lleva a su página de reservas, el texto para la bio de Instagram y un
   mensaje para mandar por WhatsApp, cada uno con su botón de copiar.
9. **Given** esa pantalla, **When** toca "Imprimir cartel", **Then** sale una hoja con el
   nombre de la barbería, "Sacá tu turno online", el QR y el link, sin menús ni botones.

### Edge Cases

- **El mail del dueño ya tenía cuenta** (registró una segunda barbería): recibe la
  bienvenida igual; la serie corre por barbería, no por persona.
- **El envío de un mail falla:** se reintenta en la próxima pasada dentro de la ventana.
- **Dos pasadas a la vez:** nadie recibe dos veces el mismo mail.
- **La migración no se corrió:** no sale ningún mail de la serie (ni uno por hora).
- **Barbería creada por el fundador desde `/owner`** (no por registro): no recibe la
  serie; ese alta la acompaña el fundador en persona.
- **Nombre de barbería muy largo:** el cartel lo acomoda en dos líneas sin romperse.

## Functional Requirements

### Must Have (MVP)

- **FR-001**: Al registrarse una barbería, el dueño MUST recibir un mail de bienvenida
  con su link público y el acceso a su panel.
- **FR-002**: Mientras la barbería tenga 0 turnos y la prueba vigente, el dueño MUST
  recibir un mail en el día 1, otro en el día 3 y otro en el día 7 desde el registro,
  entre las 10 y las 13 (hora argentina).
- **FR-003**: Cada mail de la serie MUST mandarse una sola vez por barbería, y la serie
  MUST cortarse en cuanto la barbería tenga su primer turno.
- **FR-004**: Si se saltearon pasos, el sistema MUST mandar solo el del paso más
  avanzado que corresponda, nunca varios juntos.
- **FR-005**: En el día 3 con 0 turnos, el fundador MUST recibir un aviso con el nombre
  de la barbería y el WhatsApp del dueño.
- **FR-006**: El panel MUST tener una pantalla "Compartir" con: el link público, un QR a
  la página de reservas, un texto para la bio de Instagram y un mensaje para WhatsApp,
  cada uno copiable con un toque.
- **FR-007**: Desde "Compartir" el dueño MUST poder imprimir un cartel de una hoja con el
  nombre de la barbería, el QR y el link.
- **FR-008**: Los mails de la serie MUST llevar directo a "Compartir".
- **FR-009**: El envío MUST poder correrse en modo de prueba que informa a quién le
  mandaría qué, sin mandar nada.

### Won't Have (out of scope)

- Mensajes automáticos por WhatsApp (se usa el link `wa.me`, no la API).
- Reactivar barberías con la prueba ya vencida: las contacta el fundador.
- Un interruptor para que el dueño se dé de baja de la serie: son 4 mails en 7 días y se
  cortan solos.
- Cambios en la guía "Primeros pasos" más allá de enlazar a "Compartir".

## Key Entities

- **Barbería** (existente): fecha de registro, estado de la prueba.
- **Registro de mails de activación** (nuevo): un renglón por barbería y paso.

## Success Criteria

- **SC-001**: Toda barbería que se registre recibe la bienvenida (verificable en el
  registro de envíos) en menos de un minuto.
- **SC-002**: Ninguna barbería recibe dos veces el mismo paso, ni un paso después de su
  primer turno.
- **SC-003**: De las próximas 5 barberías que se registren, al menos 3 reciben su primer
  turno dentro de los 7 días (hoy: de las últimas 3, ninguna).
- **SC-004**: El cartel se imprime en una hoja A4, legible, sin elementos del panel.
- **SC-005**: Cero regresiones en el registro: tarda lo mismo y los tests siguen en verde.

## Assumptions

- **La serie corre solo en los primeros 14 días y con la prueba vigente.** Pasado eso,
  mandarle "compartí tu link" a alguien que ya no puede usar el producto es ruido.
- **"Tener turnos" es tener al menos uno no eliminado**, lo cargue el cliente o el propio
  barbero: cualquiera de los dos dice que el producto se está usando.
- **Días contados en hora argentina desde el registro.** Quien se registra a las 23 h
  recibe el mail del día 1 a la mañana siguiente (día calendario), no a las 24 horas.
- **El QR lleva a la página de reservas** (`/<barbería>/reservar`), no a la portada: el
  que escanea desde el sillón ya decidió que quiere turno.
- **Una dependencia nueva, chica y sin dependencias propias, para generar el QR**
  (`qrcode-generator`). Codificar un QR a mano no se justifica.
- La pantalla "Compartir" es nueva y sigue el look actual del panel (tarjetas, degradé
  dorado en botones, fondo negro), no el de la remasterización que se descartó.

## Dependencies

- Una migración (la corre Bautista): la tabla del registro de mails de activación.
- Resend, con cabecera única por mail (para que Gmail no colapse los repetidos).
- El cron por GitHub Actions (mismos secretos que los otros).
