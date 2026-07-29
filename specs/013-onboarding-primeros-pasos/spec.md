# Specification: Onboarding optimizado — "Primeros pasos"

**Branch**: `013-onboarding-primeros-pasos`
**Created**: 2026-07-29
**Status**: Draft
**Input**: Tras el registro self-serve el barbero cae en su panel con la barbería a medio
configurar y sin ninguna guía de qué hacer ni de que tiene que compartir su link.

## Contexto

El registro self-serve ya funciona y deja la barbería **usable pero genérica**: un solo
servicio llamado "Corte" a $10.000 y 30 minutos, horario de 09:00 a 20:00 **los siete
días** (domingo incluido), un solo barbero con el nombre del dueño, y sin logo, sin
dirección y sin Instagram. Apenas termina el registro, el barbero es redirigido al panel y
queda solo frente al Dashboard.

De ahí salen dos problemas concretos:

1. **No sabe qué le falta.** Nadie le dice que el precio no es el suyo, que quedó abierto
   los domingos, ni que su landing muestra tarjetas de dirección e Instagram vacías. Si
   comparte el link así, su barbería se ve peor de lo que es.
2. **No sabe que tiene un link para compartir.** El producto entero depende de que el
   barbero mande su link por WhatsApp e Instagram. Hoy tiene que deducir cuál es su URL
   pública.

El trial arranca en el plan más alto por 14 días, así que durante el onboarding no hay
funcionalidad bloqueada por plan: la única barrera es saber qué hacer.

**Principio:** la guía tiene que llevarlo hasta el momento en que **comparte su link con un
cliente real**. Todo lo que no acerque a eso, sobra.

## User Scenarios & Testing

### Primary User Story

Un dueño de barbería termina de registrarse y entra a su panel por primera vez. Ve una guía
de primeros pasos que le muestra exactamente qué le falta para que su barbería esté
presentable, con un acceso directo a cada cosa. Va tachando pasos, ve el avance, y al
terminar recibe su link público listo para mandar por WhatsApp.

### Acceptance Scenarios

1. **Given** un barbero recién registrado que entra a su panel por primera vez, **When**
   ve el Dashboard, **Then** encuentra la guía de primeros pasos como lo primero y más
   destacado de la pantalla, con la cuenta de pasos completados sobre el total.
2. **Given** un barbero con la barbería tal como la dejó el registro, **When** abre la
   guía, **Then** los pasos de revisar servicios, revisar horarios y completar los datos de
   contacto aparecen como pendientes, porque su barbería todavía está en los valores por
   defecto.
3. **Given** un paso pendiente, **When** el barbero lo toca, **Then** llega directo a la
   pantalla donde se resuelve ese paso, sin tener que buscarla en el menú.
4. **Given** un barbero que ya ajustó sus servicios con sus precios reales, **When**
   vuelve al Dashboard, **Then** ese paso figura completado sin que él haya tenido que
   marcarlo a mano.
5. **Given** un barbero que completó todos los pasos, **When** vuelve al Dashboard,
   **Then** la guía ya no ocupa el lugar principal y en su lugar queda visible su link
   público con la opción de compartirlo.
6. **Given** un barbero al que la guía le molesta, **When** elige ocultarla, **Then** deja
   de aparecer en el Dashboard y puede volver a abrirla después desde un lugar previsible.
7. **Given** una barbería que existe desde antes de esta guía y ya está configurada,
   **When** su dueño entra al panel, **Then** no se le muestra una guía llena de pasos
   pendientes que no tienen sentido para él.

### Edge Cases

- **Barbería vieja ya configurada:** la guía calcula sus pasos sobre el estado real, así
  que una barbería que ya tiene todo aparece completa (o directamente no muestra la guía).
- **Barbería a la que le vencieron el plan:** el panel está en modo lectura y no se puede
  configurar nada; la guía no debe invitar a acciones que van a fallar.
- **El barbero completa un paso y no vuelve al Dashboard:** el avance no depende de pasar
  por el Dashboard; se recalcula cada vez que la guía se muestra.
- **El barbero borra algo ya hecho** (por ejemplo, elimina todos sus servicios menos el
  genérico): el paso vuelve a figurar pendiente, porque refleja el estado real.
- **Un solo barbero y sin equipo:** sumar barberos no puede ser un paso obligatorio; una
  barbería de un solo sillón está completa sin eso.
- **Pantalla de celular:** el barbero se configura la barbería desde el teléfono, entre
  cliente y cliente; la guía tiene que ser cómoda ahí, no solo en escritorio.
- **Barbero que ya compartió su link y recibió turnos:** la guía no debe seguir pidiéndole
  que "pruebe una reserva".

## Functional Requirements

### Must Have (MVP)

- **FR-001**: El panel debe mostrarle al barbero una guía de primeros pasos con la cantidad
  de pasos completados sobre el total, ubicada donde la vea sin buscarla.
- **FR-002**: El avance de cada paso debe calcularse a partir del **estado real de la
  barbería**, no de casillas que el barbero marque a mano.
- **FR-003**: La guía debe cubrir, como mínimo, estos pasos: (a) revisar los servicios con
  sus precios y duraciones reales, (b) revisar los días y horarios de atención, (c)
  completar los datos de contacto que se muestran en la landing pública, (d) compartir el
  link público.
- **FR-004**: Cada paso debe llevar en un toque a la pantalla donde se resuelve.
- **FR-005**: Cada paso debe distinguirse claramente entre pendiente y completado.
- **FR-006**: Un paso se considera cumplido cuando el barbero **cambió el valor que dejó el
  registro**, no por el solo hecho de que el dato exista (un servicio que sigue llamándose
  "Corte" a $10.000 no cuenta como revisado).
- **FR-007**: La guía debe darle al barbero su link público completo, listo para copiar y
  para mandar por WhatsApp.
- **FR-008**: Cuando todos los pasos están completos, la guía debe dejar de ocupar el lugar
  principal del panel y no volver a reclamar atención.
- **FR-009**: El barbero debe poder ocultar la guía en cualquier momento y volver a
  mostrarla después desde un lugar previsible.
- **FR-010**: Una barbería que ya está configurada no debe ver una guía con pasos
  pendientes que no le corresponden.
- **FR-011**: Con el plan vencido (panel en modo lectura), la guía no debe invitar a
  acciones de configuración que el barbero no puede completar.
- **FR-012**: La guía debe ser cómoda de usar en pantalla de celular.

### Should Have

- **FR-101**: La guía debe sugerirle cargar su logo, sin que eso sea obligatorio para
  considerarla terminada.
- **FR-102**: La guía debe proponerle hacer una reserva de prueba en su propia landing para
  que vea el flujo como lo ve un cliente, y considerar ese paso cumplido si su barbería ya
  recibió al menos un turno.
- **FR-103**: Al terminar el registro, el barbero debería llegar al panel con la guía ya
  visible, sin ningún paso intermedio.

### Won't Have (out of scope)

- Cambiar el formulario de registro, sus campos o su validación.
- Cambiar qué provisiona el registro (servicio, horario y barbero por defecto se mantienen
  como están).
- Un asistente de varios pasos a pantalla completa que bloquee el panel hasta terminarlo.
- Tour interactivo con resaltado de elementos de la interfaz.
- Emails o notificaciones de seguimiento del onboarding ("te faltan 2 pasos").
- Métricas o embudo de onboarding para el owner de la plataforma.
- Plantillas de servicios por tipo de barbería.
- Cambios en la landing pública de la barbería, en el flujo de reserva o en el cobro.
- Nuevas dependencias o tokens de diseño nuevos.

## Success Criteria

- **SC-001**: Un barbero recién registrado identifica qué le falta configurar en menos de
  10 segundos desde que entra al panel, sin abrir el menú.
- **SC-002**: Un barbero que sigue la guía de principio a fin deja su barbería presentable
  (servicios y horarios propios, datos de contacto completos) y con su link a mano, sin
  pedir ayuda.
- **SC-003**: El 100% de los pasos refleja el estado real de la barbería: hacer el cambio
  correspondiente en el panel alcanza para que el paso figure completado.
- **SC-004**: Ninguna barbería ya configurada ve pasos pendientes que no le corresponden.
- **SC-005**: Un barbero puede recorrer la guía completa desde el celular.
- **SC-006**: El proyecto compila y pasa sus verificaciones de calidad sin errores nuevos, y
  sin cambios en la base de datos.

## Assumptions

- **Sin cambios en la base de datos.** El avance se deriva de datos que ya existen
  (servicios, horarios, datos de la barbería, turnos), así que no hace falta ni una tabla
  ni una columna nueva. Es una decisión deliberada: evita una migración y evita que el
  avance se desincronice de la realidad.
- **La preferencia de "ocultar la guía" es del navegador**, no un dato de la barbería: es
  una comodidad de la interfaz, no información del negocio, y así tampoco necesita
  migración.
- **Durante el trial no hay nada bloqueado por plan** (arranca en el plan más alto por 14
  días), así que la guía no necesita lógica de upsell.
- **Sumar barberos al equipo no es un paso obligatorio**: la mayoría de las barberías que
  se dan de alta solas son de un sillón.
- **Los valores que deja el registro son conocidos y fijos** (el servicio "Corte" a $10.000
  por 30 minutos, el horario 09:00–20:00 los siete días), así que se puede detectar con
  precisión si el barbero todavía no los revisó.
- **La guía vive en el Dashboard del panel**, que es a donde cae el barbero al terminar el
  registro y al iniciar sesión.
- **El copy va en español rioplatense**, como el resto del producto.

## Dependencies

- Registro self-serve y la provisión de barbería que hace hoy (define los valores por
  defecto que la guía detecta).
- Pantallas de configuración ya existentes a las que apunta cada paso: servicios y horarios
  por barbero, configuración de la barbería, galería/logo.
- Sistema de diseño del panel (tarjetas de métrica, tokens negro/dorado) y el componente de
  tip contextual que ya existe.
- Modo lectura por plan vencido, para no ofrecer acciones imposibles.

## Next Steps

- Run **speckit-plan** to design the implementation
