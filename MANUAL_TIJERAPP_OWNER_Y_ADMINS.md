# MANUAL_TIJERAPP_OWNER_Y_ADMINS.md

Guia integral para entender TijerApp como producto, operarlo en el dia a dia y explicarlo con claridad a barberias clientes.

---

## 1. Que es TijerApp

TijerApp es un SaaS de turnos para barberias modernas.

No es una app hecha para una sola barberia. Es una plataforma multi-barberia donde cada cliente tiene:

- su pagina publica
- su flujo de reserva
- su panel admin
- sus barberos
- sus servicios
- sus datos aislados

La idea central del producto es simple:

> el cliente reserva online, la barberia ordena su agenda, y TijerApp mantiene separada la operacion de cada negocio.

---

## 2. Para quien esta pensado

TijerApp esta pensado para tres perfiles:

### 2.1 Cliente final

Persona que quiere reservar un turno rapido, sin registrarse y sin escribir mensajes largos por WhatsApp.

### 2.2 Admin de barberia

Duenio, socio o barbero encargado de gestionar la agenda diaria, confirmar turnos, mover la operacion y mantener el negocio ordenado.

### 2.3 Owner de TijerApp

Administrador general de la plataforma. Tiene vision global del sistema, puede crear barberias, revisar estado general y gestionar la expansion del producto.

---

## 3. Que ya funciona hoy

Hoy TijerApp ya tiene una base muy solida. Estas son las funciones principales que ya existen:

- home comercial de TijerApp
- login global en `/login`
- panel owner en `/owner`
- paginas publicas por barberia via slug
- reserva publica por barberia
- reservas reales guardadas en Supabase
- seleccion de barbero real
- servicios reales por barbero
- bloqueo de horarios ocupados por barbero
- login admin por barberia
- panel admin mobile-first
- confirmacion de turnos
- cancelacion de turnos
- eliminacion logica de turnos
- gestion real de barberos
- gestion real de servicios por barbero
- control de acceso por barberia
- integracion demo con WhatsApp
- base multi-barberia
- base multi-barbero

---

## 4. Que esta preparado o parcialmente avanzado

Estas partes ya estan encaminadas o preparadas, aunque algunas dependen de terminar configuraciones externas o fases siguientes:

- reportes por email
- push notifications
- fidelizacion
- cupones
- lista de espera
- galeria publica
- resenas
- configuracion avanzada de barberia
- crecimiento comercial por planes

Importante: para vender bien el producto hay que diferenciar siempre entre:

- lo que ya funciona hoy
- lo que ya esta preparado
- lo que forma parte del roadmap futuro

---

## 5. Estructura general del sistema

La arquitectura del producto gira alrededor del slug de cada barberia.

Ejemplos:

- `/sv-barber`
- `/gino-barber`
- `/ag-barber`

Cada slug representa una barberia distinta.

### 5.1 Rutas principales

#### Rutas globales

- `/` -> landing general de TijerApp
- `/login` -> login principal de la plataforma
- `/owner` -> panel global del owner

#### Rutas publicas por barberia

- `/[slug]` -> pagina publica de la barberia
- `/[slug]/reservar` -> pagina de reserva publica

#### Rutas admin por barberia

- `/[slug]/admin` -> panel admin principal
- `/[slug]/admin/barbers` -> gestion de barberos
- `/[slug]/admin/settings` -> configuracion

Puede haber mas modulos internos segun el avance del proyecto, pero estas son las rutas estructurales mas importantes para entender el sistema.

---

## 6. Modelo mental correcto del producto

Para explicarlo bien, el modelo mental correcto es este:

### 6.1 TijerApp no vende "una web"

Vende un sistema operativo para la agenda de una barberia.

### 6.2 Cada barberia tiene su propio espacio

Cada barberia tiene:

- identidad publica
- agenda propia
- barberos propios
- servicios propios
- clientes propios
- admins propios

### 6.3 La reserva no se hace por barberia solamente

La reserva se hace contra un barbero especifico.

Ese detalle cambia todo, porque el sistema no bloquea turnos de forma global: bloquea disponibilidad por barbero.

Eso permite que:

- dos barberos distintos puedan atender a la misma hora
- un mismo barbero no pueda tener dos turnos al mismo tiempo

---

## 7. Flujo completo del cliente final

Este es el recorrido real de una persona que reserva.

### Paso 1. Entra a la pagina publica

Ejemplo:

- `/sv-barber`

Ve nombre de la barberia, propuesta, servicios y boton para reservar.

### Paso 2. Entra a la pagina de reserva

Ejemplo:

- `/sv-barber/reservar`

### Paso 3. Elige barbero

Si hay un solo barbero activo, el sistema lo selecciona solo.

Si hay varios, el cliente debe elegir cual quiere.

### Paso 4. Elige servicio

Los servicios dependen del barbero seleccionado.

Esto es clave: no todos los barberos tienen por que ofrecer exactamente lo mismo.

### Paso 5. Elige fecha

Cuando elige la fecha, el sistema consulta disponibilidad real.

### Paso 6. Elige horario

Solo se pueden elegir horarios realmente disponibles para ese barbero y esa fecha.

Si un horario ya esta ocupado por un turno activo, aparece bloqueado.

### Paso 7. Carga sus datos

Completa:

- nombre
- telefono
- comentario opcional

### Paso 8. Reserva

Cuando toca reservar:

1. se validan los campos
2. se valida otra vez la disponibilidad
3. se guarda la reserva en Supabase
4. si todo sale bien, se abre WhatsApp con mensaje prearmado

### Paso 9. La barberia ve el turno en admin

La reserva ya queda disponible en el panel de la barberia.

---

## 8. Flujo completo del admin de barberia

Este es el recorrido operativo diario.

### 8.1 Login

El admin puede entrar desde:

- `/login` como acceso principal
- o desde la ruta de su barberia si se mantiene compatibilidad

Despues del login, entra al admin de la barberia a la que tiene acceso.

### 8.2 Vista diaria

En el panel admin, la idea principal es ordenar el trabajo del dia.

El admin ve:

- resumen por fecha
- proximos turnos
- filtros de reservas
- acciones rapidas

### 8.3 Gestion de turnos

Cada reserva puede pasar por distintos estados:

- `pending`
- `confirmed`
- `cancelled`
- `deleted`

### 8.4 Acciones principales del admin

#### Confirmar turno

Cambia el estado a `confirmed`.

#### Enviar WhatsApp

Abre WhatsApp con mensaje prearmado al cliente.

No cambia el estado automaticamente.

#### Cancelar turno

Cambia el estado a `cancelled`.

#### Eliminar logicamente

Si un turno cancelado ya no molesta operativamente, puede marcarse como `deleted`.

Eso lo saca del flujo normal, pero no borra la fila real de la base.

#### Restaurar

Un turno `deleted` puede volver a `cancelled`.

### 8.5 Ajuste operativo del tiempo real

Uno de los diferenciales mas importantes del admin es que no vive atado solo a la duracion teorica del servicio.

Si un corte normalmente dura 30 minutos pero un cliente tarda 35 o 40, el admin puede reflejar eso en la operacion.

Eso impacta en:

- disponibilidad siguiente
- lectura de agenda
- cierre estimado del dia
- aprovechamiento horario

En otras palabras: TijerApp no modela solo "turnos bonitos", modela tiempo real de trabajo.

---

## 9. Flujo del owner de TijerApp

El owner opera la plataforma a nivel negocio y sistema.

### 9.1 Que hace el owner

- entra a `/owner`
- ve barberias conocidas o registradas
- revisa estado general
- crea nuevas barberias
- asigna admins
- controla la expansion comercial

### 9.2 Diferencia entre owner y admin

El owner es de la plataforma.

El admin pertenece a una barberia.

Eso significa que:

- el owner piensa el negocio completo
- el admin piensa la operacion de su local

---

## 10. Barberos, servicios y disponibilidad

Esta es una de las partes mas importantes para entender de verdad el sistema.

### 10.1 Una barberia puede tener varios barberos

Cada barbero tiene:

- nombre
- display name o rol
- WhatsApp opcional
- estado activo o inactivo

### 10.2 Cada barbero puede tener sus propios servicios

Cada servicio tiene:

- nombre
- precio
- duracion base en minutos
- estado activo o inactivo

### 10.3 La disponibilidad se calcula por barbero

El sistema no pregunta solo:

> "hay lugar en la barberia?"

Pregunta:

> "este barbero especifico tiene disponible este horario para este servicio en esta fecha?"

Esa es la base del enfoque multi-barbero real.

---

## 11. Estados de una reserva

Entender bien esto es fundamental para operar y tambien para explicarlo a clientes.

### `pending`

Turno reservado pero todavia no confirmado manualmente.

### `confirmed`

Turno validado por la barberia.

### `cancelled`

Turno cancelado. No debe bloquear horarios.

### `deleted`

Turno ocultado de la operacion diaria, pero conservado en base por trazabilidad.

---

## 12. Seguridad y accesos

TijerApp no depende solo de ocultar pantallas en frontend.

La idea de seguridad correcta es:

- autenticacion con Supabase Auth
- control de acceso por barberia
- datos aislados por barberia
- RLS en Supabase

### 12.1 Que significa esto en terminos practicos

Un admin de una barberia no deberia:

- ver turnos de otra barberia
- editar barberos de otra barberia
- gestionar servicios de otra barberia

Y una persona no logueada no deberia poder entrar al admin.

---

## 13. Que diferencia a TijerApp frente a una barberia que usa WhatsApp solo

Esta parte es clave para vender.

### Problema del metodo manual

Cuando una barberia trabaja solo con WhatsApp:

- pierde mensajes
- responde tarde
- se pisa con horarios
- no tiene agenda visual
- no tiene orden por barbero
- no tiene trazabilidad

### Valor de TijerApp

Con TijerApp:

- el cliente reserva solo
- la agenda queda ordenada
- los horarios se bloquean automaticamente
- cada barbero tiene su operacion separada
- el admin puede confirmar, cancelar y organizar mejor el dia

---

## 14. Como explicar TijerApp en una frase

Version corta:

> TijerApp es un sistema de turnos para barberias, con pagina publica, agenda por barbero y panel admin mobile-first.

Version comercial:

> Vos te ocupas de cortar. TijerApp se ocupa de ordenar reservas, agenda y operacion.

Version mas completa:

> TijerApp es una plataforma para barberias que les da una pagina para tomar turnos, una agenda organizada por barbero y un panel simple para trabajar desde el celular.

---

## 15. Como hacer una demo corta a una barberia

Una demo buena no empieza por tecnologia. Empieza por el problema.

### Guion sugerido de demo

#### Paso 1. Mostrar el problema

Explicar:

- hoy la mayoria de las barberias toma turnos por WhatsApp
- eso genera desorden, demoras y horarios pisados

#### Paso 2. Mostrar la pagina publica

Abrir la barberia demo y decir:

- esta seria tu pagina publica
- aca el cliente entra, ve tu marca y reserva

#### Paso 3. Mostrar la reserva

Hacer una reserva real y remarcar:

- elige barbero
- elige servicio
- ve horarios reales
- no necesita crear cuenta

#### Paso 4. Mostrar el admin

Entrar al panel y decir:

- aca aparece la reserva
- desde aca confirmas, cancelas y ordenas el dia

#### Paso 5. Mostrar el diferencial multi-barbero

Explicar que cada barbero tiene:

- sus servicios
- sus horarios
- su propia agenda

#### Paso 6. Cerrar con el valor

Rematar con algo asi:

> no es solo una pagina de turnos; es una forma de ordenar tu barberia para trabajar mas comodo y mas profesional.

---

## 16. Como usar TijerApp internamente todos los dias

Esta es una rutina operativa simple para admins.

### Al abrir el dia

- entrar al panel
- revisar resumen por fecha
- revisar proximos turnos
- revisar pendientes

### Durante el dia

- confirmar turnos que correspondan
- usar WhatsApp cuando haga falta contacto manual
- cancelar o mover operativamente cuando haya cambios
- ajustar tiempo real si un corte tarda mas de lo previsto

### Al cerrar el dia

- revisar cancelados
- revisar turnos del dia siguiente
- dejar agenda prolija

---

## 17. Cosas importantes que no hay que explicar mal

Para no vender humo ni generar confusion, estas aclaraciones son importantes.

### Si

- TijerApp ya funciona con reservas reales
- ya tiene multi-barbero real
- ya tiene admin por barberia
- ya tiene control de acceso
- ya bloquea horarios ocupados

### Aclarar como corresponde

- WhatsApp hoy funciona por links prearmados, no por API oficial completa
- algunos modulos estan preparados pero todavia no son la pieza principal de venta
- ciertas automatizaciones dependen de configuraciones externas como email o dominio

### No prometer como si ya estuviera 100 por ciento productizado

- pagos online completos, si no estan activos
- integraciones que aun esten en roadmap
- automatizacion total sin supervision humana

---

## 18. Estado comercial honesto del producto

La forma mas sana de presentarlo hoy es esta:

### Ya listo para mostrar y testear

- home comercial
- landing publica por barberia
- reservas
- panel admin
- owner
- barberos
- servicios
- bloqueo de horarios

### Listo para seguir puliendo hacia produccion beta

- automatizaciones adicionales
- emails mas robustos
- mejoras de UX
- onboarding comercial mas completo

---

## 19. Checklist para dar de alta una barberia nueva

Cuando quieras sumar una barberia nueva, mentalmente el checklist correcto es:

1. crear la barberia
2. definir slug
3. definir admin principal
4. crear barbero o barberos
5. cargar servicios
6. definir horarios
7. revisar pagina publica
8. probar reserva
9. probar acceso admin
10. dejarla lista para testeo real

---

## 20. Checklist para capacitar a una barberia cliente

Si manana tuvieras que entrenar a una barberia, la sesion deberia cubrir:

1. como entra el cliente a reservar
2. como llega el turno al panel
3. como confirmar
4. como cancelar
5. como usar WhatsApp
6. como ver barberos
7. como administrar servicios
8. como revisar la agenda del dia

---

## 21. Puntos tecnicos que vos como duenio si deberias dominar

No hace falta que a un cliente le hables de todo esto, pero vos si deberias manejarlo.

### 21.1 Supabase

Es el backend principal. Guarda:

- usuarios
- barberias
- admins
- barberos
- servicios
- reservas

### 21.2 RLS

Es la capa que ayuda a que cada barberia vea solo sus datos.

### 21.3 Slugs

Son la llave publica del sistema.

### 21.4 Estados

Los estados del turno cambian como se comporta la operacion y la disponibilidad.

### 21.5 Eliminacion logica

No todo se borra fisicamente. En varios casos se oculta operativamente para no perder historial.

---

## 22. Demos conocidas hoy

Hoy las barberias demo conocidas incluyen:

- `sv-barber`
- `gino-barber`
- `ag-barber`

Sirven para testing y presentacion, no como casos de exito reales.

---

## 23. Prioridades de aprendizaje para vos

Si queres dominar el sistema sin abrumarte, este es el orden ideal:

### Nivel 1. Producto

Entender:

- que problema resuelve
- para quien sirve
- cual es su propuesta de valor

### Nivel 2. Operacion

Entender:

- como entra una reserva
- como se administra
- como impacta el barbero y el servicio

### Nivel 3. Plataforma

Entender:

- owner
- multi-barberia
- control de acceso
- crecimiento comercial

### Nivel 4. Tecnico estrategico

Entender:

- Supabase
- RLS
- email
- despliegue
- limites actuales

---

## 24. Frases utiles para explicar el sistema

### Para un duenio de barberia

> TijerApp te ordena los turnos y te da una agenda clara para trabajar desde el celular.

### Para un barbero

> Aca ves tus turnos, tus horarios y tus servicios sin depender de estar buscando mensajes.

### Para alguien que compara con WhatsApp

> El WhatsApp te sirve para hablar. TijerApp te sirve para operar.

### Para alguien que pregunta si es multi-barbero

> Si. Cada barbero puede tener sus propios servicios, tiempos y disponibilidad.

---

## 25. Limitaciones o aclaraciones importantes hoy

Para operar con madurez, tambien conviene conocer estas aclaraciones:

- no todo modulo esta igual de avanzado a nivel comercial
- algunas funciones dependen de configuraciones externas correctas
- el producto ya es util y demostrable, pero sigue en etapa de consolidacion hacia beta fuerte

Eso no es una debilidad; es una etapa normal de un SaaS en construccion.

---

## 26. Conclusiones

TijerApp hoy ya no es una idea. Es una plataforma funcional con:

- identidad propia
- flujo publico real
- panel admin real
- base multi-barberia
- logica multi-barbero
- backend real
- seguridad por acceso

Lo mas importante que vos tenes que saber para explicarlo bien es esto:

1. TijerApp no vende solo turnos; vende orden operativo.
2. El diferencial real esta en la agenda por barbero y la logica de trabajo diaria.
3. El owner piensa el sistema completo; el admin piensa la barberia del dia a dia.
4. Para venderlo bien, hay que hablar claro sobre lo que ya funciona y lo que esta preparado.

---

## 27. Siguiente uso recomendado de este manual

Este manual puede usarse de tres maneras:

1. como guia de estudio para vos
2. como base de capacitacion para admins
3. como fuente para armar pitch comercial, FAQ y demo guiada

El siguiente paso natural despues de leerlo es crear:

- un speech comercial corto
- un guion de demo de 5 minutos
- un FAQ de objeciones tipicas
- un checklist de onboarding para barberias nuevas
