# Specification: Catálogo de productos en la reserva

**Branch**: `035-catalogo-productos`
**Created**: 2026-10-08
**Status**: Draft — esperando el OK de Bautista para pasar a implementación
**Input**: "quiero que armemos un roadmap o speckit para crear un apartado de catálogo en
donde se ofrecerán en la parte de reservar, estos serán ceras, polvos texturizadores, etc"
(Bautista, 8/10/2026).

## Contexto

Las barberías venden productos en el mostrador: ceras, polvos texturizadores, pomadas,
aceites para barba. Hoy esa venta depende de que el barbero se acuerde de ofrecerlos con
el cliente ya parado para irse. TijerApp no los muestra en ningún lado.

No es la primera vez que aparece. Leo Cuts pidió "mostrar productos con sus precios" y
se frenó el 08/09/2026: era el único que lo pedía y la idea era ponerlo en Pro, que él no
paga. Lo que cambia ahora:

- **El pedido es otro.** Aquello era una vitrina para mirar. Esto es ofrecer el producto
  en el momento en que el cliente ya está decidiendo gastar —mientras reserva— y que se
  lo lleve anotado en el turno.
- **Va en Esencial y Pro.** Las dos barberías que hoy pagan (SV Barber y Leo Cuts) están
  en Esencial, así que las dos lo reciben desde el primer día.

### Decisiones ya tomadas (Bautista, 8/10/2026)

| Tema | Decisión |
|---|---|
| Qué hace el cliente | **Suma el producto a su turno** y lo paga en el local. Sin cobro online. |
| Stock | **Disponible / agotado**, a mano. Sin contar unidades. |
| Plan | **Esencial y Pro.** |
| Dónde más se ve | En la **página pública de la barbería**. |

## User Scenarios & Testing

### Primary User Story

Un barbero entra a su panel y carga cinco productos: nombre, precio, una foto y a qué
categoría pertenece. Un cliente entra a reservar, elige barbero, servicio, día y hora, y
antes de dejar sus datos ve "¿Te llevás algo?" con esos productos. Suma una cera. El
resumen le muestra el corte, la cera y el total, aclarando que se paga en el local. Cuando
confirma, al barbero le llega el pedido por WhatsApp con la cera incluida, y en su agenda
el turno dice "Lleva: Cera mate ×1" y cuánto tiene que cobrar en total.

### Acceptance Scenarios

**El dueño carga su catálogo**

1. **Given** un dueño en plan Esencial o Pro, **When** entra a "Productos" en su panel,
   **Then** puede crear un producto con nombre, precio, categoría, descripción corta
   (opcional) y foto (opcional).
2. **Given** un producto cargado, **When** el dueño lo marca como agotado, **Then** deja
   de ofrecerse en la reserva y en la página pública, sin borrarse.
3. **Given** varios productos, **When** el dueño los reordena, **Then** el cliente los ve
   en ese orden.
4. **Given** un producto que ya está en turnos reservados, **When** el dueño lo edita o lo
   borra, **Then** esos turnos siguen mostrando el nombre y el precio que tenía cuando se
   reservaron.
5. **Given** una barbería en plan Solo, **When** el dueño entra a "Productos", **Then** ve
   qué es y que está disponible desde Esencial, sin poder cargar.
6. **Given** un co-administrador (no dueño), **When** entra a "Productos", **Then** puede
   cargar y editar productos igual que el dueño. *(Ver "Preguntas abiertas".)*

**El cliente lo suma al reservar**

7. **Given** una barbería con productos disponibles, **When** el cliente ya eligió
   horario, **Then** ve un paso opcional "¿Te llevás algo?" con los productos, su foto y
   su precio, y puede seguir sin tocar nada.
8. **Given** ese paso, **When** el cliente suma un producto, **Then** el resumen muestra
   el servicio, cada producto y un total, con la aclaración de que se paga en el local.
9. **Given** un producto sumado, **When** el cliente cambia la cantidad o lo quita,
   **Then** el total se actualiza al instante.
10. **Given** una barbería sin productos, o con todos agotados, o en plan Solo, **When**
    el cliente reserva, **Then** el paso no aparece y la reserva es exactamente la de hoy.
11. **Given** un cliente con productos sumados, **When** confirma la reserva, **Then** el
    turno queda guardado con esos productos, y la pantalla de "turno reservado" los lista.
12. **Given** un producto que el dueño marcó agotado mientras el cliente reservaba,
    **When** el cliente confirma, **Then** el turno se reserva igual, sin ese producto, y
    el cliente ve un aviso claro de cuál no se pudo sumar.
13. **Given** un cupón aplicado, **When** hay productos en el turno, **Then** el descuento
    se calcula solo sobre el servicio.
14. **Given** una barbería con seña por Mercado Pago, **When** el cliente suma productos,
    **Then** la seña se calcula solo sobre el servicio y los productos se pagan en el local.

**El barbero lo ve**

15. **Given** un turno con productos, **When** el dueño lo mira en el turnero (lista o
    calendario), **Then** ve qué productos lleva, la cantidad y el total a cobrar.
16. **Given** ese turno asignado a un empleado, **When** el empleado lo mira en su agenda,
    **Then** ve los mismos productos.
17. **Given** una reserva sin seña, **When** se abre el WhatsApp al barbero, **Then** el
    mensaje incluye los productos pedidos.
18. **Given** el link del turno (`/r/[token]`), **When** el cliente lo abre, **Then** ve
    los productos que pidió junto al resto del detalle.

**La página pública**

19. **Given** una barbería con productos disponibles, **When** alguien entra a su página,
    **Then** ve una sección "Productos" con foto, nombre y precio, y un botón para ir a
    reservar.
20. **Given** una barbería sin productos disponibles o en plan Solo, **When** alguien
    entra a su página, **Then** la sección no aparece.

### Edge Cases

- **Manipular el pedido**: el precio, el nombre y la disponibilidad salen siempre de la
  base. Lo que manda el navegador es solo qué producto y cuántos. Un producto de otra
  barbería, borrado o agotado se descarta.
- **Cantidades absurdas**: tope de 5 unidades por producto y 10 productos distintos por
  turno. Lo que exceda se rechaza con un mensaje.
- **Cancelar el turno**: los productos se van con él. No hay stock que devolver.
- **Reprogramar el turno**: los productos lo acompañan.
- **Turno cargado a mano por el barbero**: en esta versión no se le pueden sumar
  productos desde el panel (ver "Won't Have").
- **Plan que baja a Solo o vence**: el catálogo cargado no se borra; deja de ofrecerse.
  Los turnos ya reservados siguen mostrando sus productos.
- **Foto pesada o de formato raro**: mismas reglas que la galería (PNG, JPG o WebP,
  hasta 5 MB). Un producto sin foto se muestra con un ícono, no con un hueco.
- **Muchos productos**: tope de 40 por barbería. En la reserva se muestran en una tira
  que se desliza, no en una lista que empuje los datos del cliente para abajo.

## Functional Requirements

### Must Have (MVP)

- **FR-001**: El dueño puede crear, editar, reordenar, marcar disponible/agotado y borrar
  productos de su barbería.
- **FR-002**: Cada producto tiene nombre, precio en pesos, categoría, descripción corta
  opcional y foto opcional.
- **FR-003**: Las categorías son una lista corta y fija: Cera, Pomada, Polvo
  texturizador, Barba, Shampoo y cuidado, Otro.
- **FR-004**: El catálogo está disponible en los planes Esencial y Pro. El chequeo se
  hace en el servidor, no solo en la pantalla.
- **FR-005**: En la reserva aparece un paso **opcional** para sumar productos, después
  de elegir horario y antes de los datos del cliente. No se puede quedar trabado en él.
- **FR-006**: El resumen de la reserva muestra servicio, productos y total, y dice que
  los productos se pagan en el local.
- **FR-007**: El servidor valida cada producto contra la base (barbería, disponible, no
  borrado) y guarda en el turno el nombre y el precio del momento.
- **FR-008**: Si un producto ya no se puede sumar, el turno se reserva igual y el cliente
  recibe el aviso. Nunca se pierde un turno por un producto.
- **FR-009**: El turno muestra sus productos y el total a cobrar en: turnero del dueño
  (lista y hoja del calendario), agenda del empleado, pantalla de turno reservado y link
  del turno.
- **FR-010**: El mensaje de WhatsApp al barbero incluye los productos.
- **FR-011**: La página pública de la barbería muestra una sección "Productos" cuando hay
  al menos uno disponible.
- **FR-012**: Cupón y seña se calculan únicamente sobre el servicio.
- **FR-013**: Un producto nunca se "desagota" solo ni se descuenta: el estado lo maneja
  el dueño a mano.

### Should Have

- **FR-014**: El paso de la reserva usa el mismo lenguaje visual y de movimiento que el
  resto del flujo (tarjetas con degradé, brillo dorado en lo elegido, total que cuenta).
- **FR-015**: Las fotos se muestran recortadas a un formato parejo, para que un catálogo
  cargado con fotos de celular no se vea desordenado.

### Won't Have (out of scope)

- **Cobro online de productos.** Se paga en el local.
- **Stock por unidades**, alertas de faltante, proveedores, costos o margen.
- **Sumar los productos a los ingresos, reportes, cierre de caja o comisiones.** Ver
  "Preguntas abiertas": es la decisión más delicada que queda.
- **Vender un producto sin turno** (carrito, envío, retiro).
- **Agregar productos a un turno desde el panel** (turno cargado a mano, o "al final se
  llevó una cera").
- **Productos por barbero.** El catálogo es de la barbería.
- **Variantes** (tamaños, fragancias): cada variante se carga como un producto aparte.
- **Marcar el producto como entregado o cobrado.**

## Key Entities

- **Producto**: pertenece a una barbería. Nombre, precio, categoría, descripción, foto,
  disponible sí/no, orden.
- **Producto de un turno**: un renglón por producto pedido en una reserva. Guarda una
  copia del nombre y del precio de ese momento, y la cantidad. Sobrevive a que el producto
  original se edite o se borre.

## Success Criteria

- **SC-001**: Un dueño carga su primer producto con foto en menos de un minuto, desde el
  celular.
- **SC-002**: Reservar sin sumar productos lleva los mismos toques que hoy: ni uno más.
- **SC-003**: Sumar un producto a la reserva son como mucho dos toques.
- **SC-004**: El tiempo de respuesta de una reserva sin productos no empeora (hoy ~0,5 s).
- **SC-005**: A los 30 días de salir, al menos una barbería que paga tiene productos
  cargados y al menos un turno con producto. Si ninguna lo usó, se revisa antes de seguir
  construyendo encima.

## Assumptions

- Los precios son en pesos enteros, como los servicios.
- El barbero es el que entrega y cobra el producto; TijerApp solo deja anotado el pedido.
- Una barbería tiene pocos productos (5 a 20). No hace falta buscador ni filtros.
- El cliente no espera que el producto esté "reservado" en sentido estricto: si al llegar
  no hay, lo resuelve con el barbero.

## Preguntas abiertas

1. **¿Los productos cuentan como ingreso?** Si un turno de $10.000 lleva una cera de
   $8.000, hoy los reportes, el cierre de caja y la comisión del barbero mirarían solo los
   $10.000. Sumarlos toca la plata y las comisiones (¿el empleado cobra comisión por la
   cera?). **Propuesta: en esta versión no se suman**, se muestra el total a cobrar en el
   turno y nada más, y se decide con uso real.
2. **¿Quién carga productos?** Propuesta: cualquier administrador de la barbería (como
   servicios y horarios), no solo el dueño. No crea cuentas ni toca plata.
3. **¿El empleado ve los productos de su turno?** Propuesta: sí, siempre, sin un permiso
   aparte: es parte de lo que tiene que saber para atender.

## Dependencies

- Dos migraciones (tabla de productos, tabla de productos por turno) y un espacio de
  almacenamiento para las fotos. **Las corre Bautista** en el SQL Editor de Supabase.
- Nada externo: sin proveedores nuevos ni dependencias nuevas.
