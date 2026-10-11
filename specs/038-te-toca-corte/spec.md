# Specification: "Te toca corte" — avisarle al cliente que no volvió

**Branch**: `038-te-toca-corte`
**Created**: 2026-10-11
**Status**: Spec escrita y decisiones tomadas (11/10/2026). Sin planificar ni implementar.
**Input**: "arrancá con el 2 y armá la spec del 3" (Bautista, 11/10/2026), a partir de mirar el
uso real de los últimos 30 días.

## Contexto

Los clientes de una barbería vuelven con un ritmo bastante parejo, pero nada les avisa cuando
se les pasó la fecha. El barbero no le escribe a cada uno: es un paso manual que nadie hace,
igual que lo eran confirmar los turnos y pedir la reseña antes de la 033.

### Lo que dicen los datos (11/10/2026, solo lectura)

| | SV Barber | Leo Cuts |
|---|---|---|
| Clientes que vinieron al menos una vez | 229 | 103 |
| Vinieron una sola vez | 124 | 58 |
| Vinieron dos veces o más | 105 | 45 |
| Cada cuánto vuelven (mediana) | 27 días | 28 días |
| La mitad vuelve entre | 20 y 39 días | 22 y 39 días |
| **Atrasados hoy** (pasaron su ritmo y no tienen turno) | 23 | 9 |
| …de esos, con mail | 11 | 8 |
| Vinieron una vez hace 35 a 120 días y no volvieron | 54 | 34 |
| …de esos, con mail | 22 | 25 |

"Atrasado" acá es: pasó un 25% más que su intervalo habitual desde la última visita, hace
menos de 120 días, y no tiene ningún turno reservado.

Dos lecturas:

- **El ritmo existe y es medible**: cuatro semanas, con poca dispersión. Se puede calcular por
  cliente sin pedirle nada al barbero.
- **El techo lo pone el mail**: en SV Barber, de 23 atrasados solo 11 tienen mail. Por eso esta
  función va después de subir la cantidad de clientes con mail (hecho el 11/10: las barberías
  nuevas arrancan pidiéndolo, y el campo opcional ahora dice para qué sirve).

## Qué cambia

Una vez por día, a la mañana, el sistema busca en cada barbería a los clientes que ya
deberían haber vuelto y todavía no reservaron, y les manda **un** mail en nombre de la
barbería: cuánto hace de su último corte y un botón para reservar el próximo, con su barbero
y su servicio de siempre ya elegidos.

El barbero no hace nada. En su panel ve cuántos avisos salieron y cuántos terminaron en un
turno.

## User Scenarios & Testing

### Primary User Story

Como dueño de una barbería, quiero que a mis clientes habituales les llegue solo un
recordatorio cuando se les pasó la fecha de volver, para llenar la agenda sin tener que
escribirle a cada uno.

### Acceptance Scenarios

1. **El caso normal.** Un cliente vino el 1/8, el 29/8 y el 26/9 (cada 28 días). Tiene mail y
   no tiene turno reservado. Cuando pasan 35 días de la última visita (28 + 25%) le llega el
   mail, entre las 10 y las 13. Dice el nombre de la barbería, cuánto hace de su último corte y
   tiene un botón para reservar.
2. **El botón deja todo listo.** Al tocarlo se abre la reserva de esa barbería con su barbero
   y su servicio habituales elegidos; le queda elegir día y hora. Si ese barbero o ese servicio
   ya no existen, se abre la reserva normal, sin error.
3. **Ya reservó.** Un cliente atrasado que tiene un turno pendiente o confirmado a futuro no
   recibe nada.
4. **No se insiste.** Si recibió el aviso y no reservó, no recibe otro. Recién vuelve a entrar
   en la cuenta cuando venga de nuevo.
5. **Se dio de baja.** El mail tiene un link "no quiero recibir estos avisos". Si lo toca, esa
   barbería no le manda más avisos de este tipo; la confirmación y el recordatorio de sus
   turnos le siguen llegando.
6. **El dueño lo apaga.** En Configuración hay un interruptor. Apagado, no sale ningún aviso
   de esa barbería.
7. **El dueño ve si sirve.** En el panel: avisos enviados en el mes y cuántos de esos clientes
   reservaron dentro de los 14 días siguientes.
8. **Modo prueba.** Corriéndolo a mano informa a quiénes les escribiría, sin mandar nada.

### Edge Cases

- **Una sola visita.** No hay intervalo propio: no se le escribe nunca. El mínimo configurable
  arranca en 2.
- **Un solo teléfono, varias personas** (pasa: en SV Barber un número lo usaron 9 personas).
  El intervalo de ese "cliente" sale absurdamente corto. Se pone un piso: nunca se avisa antes
  de 14 días de la última visita.
- **Cliente que venía cada dos semanas y dejó de venir hace cinco meses.** No se le escribe:
  pasados 120 días ya no es "te toca corte", es otra conversación.
- **Su último turno quedó como "Cliente no vino".** No se le escribe.
- **Cliente borrado por el dueño.** No se le escribe.
- **Mismo mail en dos clientes** (padre e hijo). Un solo aviso por mail y por barbería.
- **Mismo día que el pedido de reseña.** No se mandan los dos: si ese día le toca el pedido de
  reseña, el aviso espera al día siguiente.
- **Barbería en modo lectura o con la reserva apagada.** No sale nada: el botón llevaría a una
  página que no toma turnos.
- **Cliente de dos barberías.** Cada una lleva su cuenta por separado.
- **El cron se saltea un día.** El aviso sale al día siguiente; no se pierde ni se duplica.
- **El aviso sale y el cliente reserva por WhatsApp**, y el barbero carga el turno a mano.
  Cuenta igual como "reservó".

## Functional Requirements

### Must Have (MVP)

- **FR-001** El sistema calcula, por cliente y por barbería, el intervalo habitual entre
  visitas a partir de sus visitas ya hechas. Visita = turno confirmado con fecha de hoy o
  anterior, la misma definición que usa la pantalla de Clientes.
- **FR-002** Un cliente entra en la lista del día si: tiene mail, tiene al menos el mínimo de
  visitas que eligió la barbería (FR-014), pasó su intervalo más un 25%
  desde la última visita, pasaron al menos 14 días y no más de 120, no tiene turno activo a
  futuro, no está borrado, su último turno no fue "Cliente no vino" y no se dio de baja.
- **FR-003** A cada cliente de la lista se le manda un mail, una sola vez por visita. El envío
  se anota **antes** de mandar, para que un reintento no lo repita.
- **FR-004** El mail sale con el nombre y el logo de la barbería, dice hace cuánto fue el
  último corte y tiene un botón a la reserva con el barbero y el servicio habituales
  preseleccionados.
- **FR-005** El mail tiene un link de baja que funciona sin iniciar sesión y vale solo para
  esa barbería.
- **FR-006** Los envíos salen entre las 10 y las 13, hora de Argentina.
- **FR-007** No sale ningún aviso de una barbería en modo lectura, con la reserva pública
  apagada o con la función apagada.
- **FR-008** El dueño puede prender y apagar la función desde Configuración.
- **FR-009** El dueño ve, por mes, cuántos avisos salieron y cuántos de esos clientes
  reservaron dentro de los 14 días.
- **FR-010** Corrido a mano, el proceso arranca en modo prueba: lista a quiénes les escribiría
  y por qué, y no manda nada.
- **FR-011** Un cliente no recibe el aviso y el pedido de reseña el mismo día.
- **FR-014** El dueño elige desde cuántas visitas un cliente cuenta como habitual: de 2 a 6.
  Por defecto, **4**. Es la única perilla de la función.
- **FR-015** La función está en los planes Esencial y Pro. En Solo, el interruptor se ve con el
  aviso de que es de un plan superior.
- **FR-016** En las barberías que ya existen arranca apagada. En las que se registren después,
  prendida.

### Should Have

- **FR-012** Tope de avisos por barbería y por día (30), para que el primer día de una
  barbería con mucha historia no salgan cien mails juntos.
- **FR-013** El dueño ve la lista de a quiénes se les avisó, con la fecha.

### Won't Have (out of scope)

- WhatsApp, SMS y avisos al celular. El único canal automático hoy es el mail.
- Cupón o descuento "de regreso".
- Elegir a mano a quién escribirle, o editar el texto del mail.
- Un segundo aviso si el primero no funcionó.
- Avisos a clientes que nunca vinieron o que vinieron una sola vez.

## Key Entities

- **Aviso de regreso**: a qué cliente de qué barbería se le avisó, cuándo, por cuál visita
  (la última al momento de avisar) y si después reservó.
- **Baja de avisos**: qué mail no quiere recibir estos avisos de qué barbería.
- **Preferencia de la barbería**: si la función está prendida y desde cuántas visitas avisa.

## Success Criteria

- **SC-001** Al menos 1 de cada 10 avisos termina en un turno reservado dentro de los 14 días.
  Es el número que decide si la función se queda.
- **SC-002** Ningún cliente recibe más de un aviso por visita, ni un aviso teniendo un turno
  reservado. Verificable contra la base.
- **SC-003** El dueño no tiene que hacer nada para que funcione, y entiende en una mirada
  cuántos turnos le trajo.
- **SC-004** Menos del 2% de los que reciben el aviso se dan de baja. Más que eso quiere decir
  que molesta.
- **SC-005** Ninguna barbería reporta que le escribimos a un cliente que no correspondía.

**Cuándo mirar:** a los 60 días de prendido, o cuando haya 20 avisos enviados, lo que pase
primero. Si para entonces ninguno terminó en un turno, se apaga y no se construye nada encima.
(El plazo y el criterio salen del volumen real: ver "Decisiones tomadas".)

## Assumptions

- El ritmo de un cliente se estima bien con la mediana de sus intervalos. Con dos visitas hay
  un solo intervalo y se usa ese.
- El margen de 25% sobre el intervalo evita escribirle al que simplemente viene unos días más
  tarde. Con el ritmo típico de 28 días, el aviso sale a los 35.
- Un cliente se identifica por su teléfono dentro de una barbería, como en el resto del
  sistema.
- "Reservó gracias al aviso" se mide por tiempo (14 días), no por el clic: el que recibe el
  mail y reserva por WhatsApp también cuenta.
- El volumen es chico: hoy serían unos 20 avisos el primer día entre las dos barberías activas
  y después unos pocos por día.

## Dependencies

- Los crons puntuales desde la base (andando desde el 08/10) con los de GitHub de respaldo.
- El pedido de reseña (033), para no pisarse el mismo día.
- La reserva pública tiene que aceptar que le lleguen el barbero y el servicio ya elegidos.
- Que más clientes tengan mail. Sin eso la función llega a la mitad en SV Barber.

## Decisiones tomadas (Bautista, 11/10/2026)

1. **Plan:** Esencial y Pro.
2. **A quién:** solo a clientes con mail que vinieron al menos 4 veces, y que la barbería pueda
   cambiar ese mínimo. Al que vino una sola vez no se le escribe.
3. **Barberías existentes:** arranca apagada; Bautista les avisa a Santi y a Leo. En las nuevas,
   prendida.

### Lo que implica el mínimo de 4, medido el mismo día

| Mínimo de visitas | SV Barber: atrasados con mail | Leo Cuts: atrasados con mail |
|---|---|---|
| 2 | 11 | 8 |
| 3 | 3 | 5 |
| **4** | **2** | **4** |
| 5 | 1 | 3 |

Con el mínimo en 4 el primer día saldrían **6 avisos entre las dos barberías**, y después uno
o dos por semana. Es un público chico: con ese volumen SC-001 ("1 de cada 10 termina en
turno") no se puede medir en 30 días, porque 1 de cada 10 sobre 6 avisos es menos de un turno.

Por eso el mínimo es configurable y no fijo: 4 es el arranque prudente —le escribe solo al
cliente que claramente es de la casa— y la barbería que quiera más alcance lo baja a 2 o 3.
**Cuándo mirar** pasa de 30 a 60 días, y el criterio es por cantidad: si después de 20 avisos
ninguno terminó en turno, se apaga.

## Next Steps

`/speckit-plan`.
