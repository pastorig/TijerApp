# Remasterizacion UX/UI de TijerApp

Fecha: 2026-10-01
Estado: direccion aprobada por el usuario; implementacion incremental en curso.
Repositorio de trabajo: C:/Users/Pastori/OneDrive/Desktop/ProyectG/TijerApp.
Base inspeccionada: main, commit 9ca28ba. Existe otro checkout en Proyectos/TijerApp/tijerapp sobre una rama CRM; no es la base de este trabajo.

## Objetivo y alcance

Remasterizar la experiencia completa conservando reservas, disponibilidad, duracion real, excepciones de jornada, pagos, WhatsApp, Auth, permisos, planes, multi-barberia y multi-barbero. Una spec por seccion; implementacion incremental con estados y pruebas propios. Este paquete prepara el trabajo, no certifica un rediseño desplegado.

Audiencias: cliente que reserva desde movil; dueno que organiza la jornada; empleado con permisos limitados; owner que gestiona la plataforma; visitante que evalua contratar.

## Evidencia y limites

Se inspeccionaron rutas App Router, globals.css, BRAND.md, primitivas UI, shells admin/staff/owner, navegacion y spec de reserva de julio. Se leyeron las specs de EstetiApp de panel (2026-06-28) y landing (2026-07-16), y la spec de Pacientes de OdontoApp/Dentidad (2026-06-28). Se toma su metodo: sistema reutilizable, pantalla insignia y migracion por seccion. No se copia su paleta.

No se tomaron capturas autenticadas ni se hicieron mediciones de usabilidad en esta fase. Los problemas de texto/control pequenos y documentacion desfasada estan respaldados por codigo; una critica visual definitiva requiere capturas del sistema corriendo. No inventar resultados de Lighthouse ni afirmar QA visual realizada.

BRAND.md describe todavia el isotipo de agenda y BARBER/SYNC. La implementacion actual Logo.tsx usa public/brand/isotipo-mark.png y la marca TijerApp. AGENTS.md enumera restricciones de fases antiguas aunque el codigo ya tiene owner, empleados y pagos. Esas divergencias se registran; no se reescriben automaticamente.

## Direccion propuesta

Opcion recomendada: sistema oscuro premium operativo. Conservar isotipo vigente, Geist, negro neutro y dorado antiguo como acento; aumentar contraste y legibilidad. Dorado para seleccion/accion principal; verde, rojo e informacion conservan significado. No colorear cada seccion de una marca distinta.

Alternativa 2: panel operativo claro y marketing oscuro. Mejora posible de lectura ambiental, pero exige validar nueva identidad y todas las superficies.
Alternativa 3: pulido aislado del estilo actual. Menor cambio inicial, pero deja la fragmentacion de tipografia, controles y espaciado; insuficiente para el objetivo de remasterizacion general.

El usuario aprobo la opcion oscura recomendada y pidio capturas al terminar cada zona.

Las entregas locales se enumeran mas abajo. El bloque publico, acceso, marketing y PWA tiene una [pasada conjunta de consistencia](entrega-bloque-publico.md), con limites y pendientes explicitos para la revision final.

## Reglas compartidas

- Componentes visuales separados de queries, contratos y reglas de negocio; aprovechar src/components/ui y cn.
- 14-16px cuerpo operativo, >=12px metadata, inputs de 16px en movil; headings operativos 20-28px. Evitar texto funcional de 9-11px y tracking exagerado; letter-spacing 0.
- Controles tactiles >=44x44px aunque su icono visible sea menor; iconos lucide con nombre accesible.
- Radios <=8px para cards/controles; secciones abiertas, sin card dentro de card. No convertir todas las acciones en pills.
- Layout a 360/390/768/1024/1440px; sin overflow horizontal de documento. Solo contenedores que lo requieran (calendario/comparacion) pueden tener scroll local explicitamente indicado.
- Foco visible, labels asociados, navegacion por teclado, contraste WCAG AA medido, errores junto a campos y live regions sin anuncios duplicados.
- Drawers/dialogos con foco gestionado, Escape y restauracion; CTA fija respeta teclado, safe-area y ultimo campo.
- Cargas con espacio reservado; vacio real distinto de filtro sin resultados, fallo, acceso denegado y feature no incluida.
- Animacion con transform/opacity, tokens compartidos y reduced-motion; contenido publico visible sin depender de Reveal.
- Usar Framer Motion ya instalado. No agregar GSAP, Lenis, nueva libreria de UI o nuevos paquetes por efecto visual.
- Conservar montos, etiquetas de estado y contratos; las nuevas pantallas nunca inventan facturacion, visitas o confirmaciones.

## Contratos funcionales de regresion

Disponibilidad por barberia/barbero/fecha, pending/confirmed activos, cancelled/deleted fuera del bloqueo. Inicio de siguiente hueco segun fin real y horario efectivo. Excepciones de jornada por fecha/rango preservan pausas y no mutan semana. Aviso de sobrante solo ultimo turno del barbero. Extender cierre no genera en cascada sugerencias de agregar otro corte.

Guardar reserva antes de WhatsApp. Confirmar y WhatsApp siguen separados. Revalidar conflicto en servidor. Seña, webhook y estado de pago no se reinterpretan en cliente. Auth y permisos siguen en servidor/RLS; UI no sustituye autorizacion. Plan vencido conserva lectura y bloqueos vigentes. Owner plataforma, dueno barberia y empleado son contextos diferentes.

## Orden de ejecucion y entregas

1. 00/01/02: sistema visual, movimiento y shells. Capturar base antes de tocar tokens globales.
2. 13/14: Inicio y agenda como pantallas insignia; validar con dueno desde movil.
3. 08/09/10/11/12: pagina publica, reserva y links de cliente.
4. 21/22/28: barberos, servicios, horarios, permisos y empleado.
5. 17/23/24/25/27: clientes, reportes, caja, cobros y configuracion.
6. 15/16/18/19/20/26: recordatorios, espera, resenas, fidelizacion, cupones y galeria.
7. 29/30/31/32: owner, planes, alta privada y solicitudes.
8. 03/04/05/06/07/33: marketing, acceso y cierre de consistencia PWA; acceso puede adelantarse si el shell lo requiere.

Cada grupo se entrega como diff revisable y preview probado. No mezclar migraciones ni nuevas features en una entrega visual. Crear rama dedicada al implementar; preservar .gitignore y archivos ajenos existentes. No commit, merge, push ni deploy automatico de esta propuesta.

## Verificacion exigida al implementar

- Capturas base y final mobile/desktop, datos anonimizados; escenarios sin datos, una barberia, multiples barberos, nombres largos.
- Medir contraste, comprobar teclado/reduced-motion y confirmar controles tactiles.
- npm run lint, npm run build y npm run test:unit donde cambia interaccion compartida o disponibilidad.
- E2E criticos en entorno demo separado: reserva/disponibilidad/conflicto, confirmar/cancelar/restaurar, permisos y pago sandbox. No crear reservas reales ni enviar correos reales para QA de estilos.
- Presupuesto: no empeorar CLS respecto de base medida; conservar espacio de skeletons y render visible de LCP. Perf objetivo a validar, no resultados prometidos.
- Definicion de terminado: requisitos de spec verificables, rutas cubiertas, capturas validas, pruebas verdes y pendientes declarados.

## Skills utilizadas

Impeccable para separar superficies Persuade/Operate/Read y planificar jerarquia; ui-ux-pro-max para accesibilidad/tactil/motion. Su recomendacion generica azul/glass no se adopta: no coincide con la identidad real. Brainstorming para propuesta y division en specs. Las skills estan instaladas localmente; no fue necesaria otra instalacion. El launcher de Impeccable fallo por permisos/cache; contexto obtenido de archivos.

## Indice de specs

- [Sistema de diseno](00-sistema-diseno/spec.md)
- [Animaciones y microinteracciones](01-movimiento/spec.md)
- [Navegacion y shells](02-navegacion/spec.md)
- [Landing principal](03-home/spec.md)
- [Presentacion del producto](04-producto/spec.md)
- [Planes y precios](05-precios/spec.md)
- [Guias y lectura](06-guias/spec.md)
- [Login, registro y recuperacion](07-acceso/spec.md)
- [Pagina publica de barberia](08-publica/spec.md)
- [Formulario de reserva](09-reserva/spec.md)
- [Gestion de turno por link](10-turno-cliente/spec.md)
- [Lista de espera por link](11-espera-cliente/spec.md)
- [Resena publica](12-resena-cliente/spec.md)
- [Inicio del admin](13-dashboard/spec.md)
- [Turnero y agenda](14-agenda/spec.md)
- [Recordatorios y avisos](15-recordatorios/spec.md)
- [Lista de espera admin](16-espera-admin/spec.md)
- [Clientes](17-clientes/spec.md)
- [Resenas en admin](18-resenas-admin/spec.md)
- [Fidelizacion](19-fidelizacion/spec.md)
- [Cupones](20-cupones/spec.md)
- [Barberos, servicios y horarios](21-barberos/spec.md)
- [Administradores y empleados](22-equipo/spec.md)
- [Reportes](23-reportes/spec.md)
- [Cierre de caja](24-cierre/spec.md)
- [Cobros online y MercadoPago](25-cobros/spec.md)
- [Galeria](26-galeria/spec.md)
- [Configuracion de barberia](27-configuracion/spec.md)
- [Experiencia del empleado](28-empleado/spec.md)
- [Dashboard owner](29-owner/spec.md)
- [Planes y cobros owner](30-owner-planes/spec.md)
- [Alta privada de barberia](31-owner-alta/spec.md)
- [Mensajes y solicitudes owner](32-owner-mensajes/spec.md)
- [PWA, arranque y estados globales](33-pwa/spec.md)

## Cobertura de rutas

- `/` -> [Landing principal](03-home/spec.md)
- `/producto` -> [Presentacion del producto](04-producto/spec.md)
- `/precios` -> [Planes y precios](05-precios/spec.md)
- `/guias`
- `/guias/[slug]` -> [Guias y lectura](06-guias/spec.md)
- `/login`
- `/registro`
- `/recuperar`
- `/nueva-password`
- `/owner/login`
- `/[barbershopSlug]/admin/login` -> [Login, registro y recuperacion](07-acceso/spec.md)
- `/[barbershopSlug]` -> [Pagina publica de barberia](08-publica/spec.md)
- `/[barbershopSlug]/reservar` -> [Formulario de reserva](09-reserva/spec.md)
- `/r/[token]`
- `/r/[token]/responder` -> [Gestion de turno por link](10-turno-cliente/spec.md)
- `/w/[token]` -> [Lista de espera por link](11-espera-cliente/spec.md)
- `/rev/[token]` -> [Resena publica](12-resena-cliente/spec.md)
- `/[barbershopSlug]/admin` -> [Inicio del admin](13-dashboard/spec.md)
- `/[barbershopSlug]/admin/turnero` -> [Turnero y agenda](14-agenda/spec.md)
- `/[barbershopSlug]/admin/recordatorios` -> [Recordatorios y avisos](15-recordatorios/spec.md)
- `/[barbershopSlug]/admin/lista-espera` -> [Lista de espera admin](16-espera-admin/spec.md)
- `/[barbershopSlug]/admin/clientes` -> [Clientes](17-clientes/spec.md)
- `/[barbershopSlug]/admin/resenas` -> [Resenas en admin](18-resenas-admin/spec.md)
- `/[barbershopSlug]/admin/fidelizacion` -> [Fidelizacion](19-fidelizacion/spec.md)
- `/[barbershopSlug]/admin/cupones` -> [Cupones](20-cupones/spec.md)
- `/[barbershopSlug]/admin/barbers` -> [Barberos, servicios y horarios](21-barberos/spec.md)
- `/[barbershopSlug]/admin/equipo` -> [Administradores y empleados](22-equipo/spec.md)
- `/[barbershopSlug]/admin/reportes` -> [Reportes](23-reportes/spec.md)
- `/[barbershopSlug]/admin/cierre` -> [Cierre de caja](24-cierre/spec.md)
- `/[barbershopSlug]/admin/cobros` -> [Cobros online y MercadoPago](25-cobros/spec.md)
- `/[barbershopSlug]/admin/galeria` -> [Galeria](26-galeria/spec.md)
- `/[barbershopSlug]/admin/settings` -> [Configuracion de barberia](27-configuracion/spec.md)
- `/[barbershopSlug]/mi-agenda`
- `/[barbershopSlug]/mi-agenda/ganancias`
- `/[barbershopSlug]/mi-agenda/cuenta` -> [Experiencia del empleado](28-empleado/spec.md)
- `/owner` -> [Dashboard owner](29-owner/spec.md)
- `/owner/planes` -> [Planes y cobros owner](30-owner-planes/spec.md)
- `/owner/create-barbershop` -> [Alta privada de barberia](31-owner-alta/spec.md)
- `/owner/mensajes` -> [Mensajes y solicitudes owner](32-owner-mensajes/spec.md)
- `/abrir`
- `/offline` -> [PWA, arranque y estados globales](33-pwa/spec.md)

## Siguiente punto de revision

Entregas locales: [Navegacion](02-navegacion/entrega-admin.md), [Inicio](13-dashboard/entrega-inicio.md) y [Turnero](14-agenda/entrega-agenda.md). Las notas de verificacion del paquete de abajo corresponden a la etapa inicial de especificacion.

Cuarta zona: [Clientes y ficha](17-clientes/entrega-clientes.md).

Quinta zona: [Barberos, servicios y horarios](21-barberos/entrega-barberos.md).

Sexta zona: [Equipo y accesos](22-equipo/entrega-equipo.md).

Septima zona: [Reportes](23-reportes/entrega-reportes.md).

Octava zona: [Cierre de caja](24-cierre/entrega-cierre.md).

Novena zona: [Cobros online](25-cobros/entrega-cobros.md).

Decima zona: [Configuracion de barberia](27-configuracion/entrega-configuracion.md).

Undecima zona: [Galeria](26-galeria/entrega-galeria.md).

Duodecima zona: [Recordatorios](15-recordatorios/entrega-recordatorios.md).

Decimotercera zona: [Lista de espera](16-espera-admin/entrega-espera.md).

Decimocuarta zona: [Resenas admin](18-resenas-admin/entrega-resenas.md).
Decimoquinta zona: [Fidelizacion admin](19-fidelizacion/entrega-fidelizacion.md).
Decimosexta zona: [Cupones admin](20-cupones/entrega-cupones.md).
Decimoseptima zona: [Agenda del empleado](28-empleado/entrega-agenda.md).
Decimoctava zona: [Ganancias y cuenta](28-empleado/entrega-cuenta-ganancias.md).
Decimonovena zona: [Formularios del empleado](28-empleado/entrega-formularios.md).

Vigesima zona: [Navegacion owner](29-owner/entrega-navegacion.md).

Zona 21: [Resumen owner](29-owner/entrega-resumen.md). El listado operativo sigue pendiente.

Zona 22: [Listado operativo owner](29-owner/entrega-listado.md). Completa el listado pendiente de la zona 21.

Zona 23: [Planes owner](30-owner-planes/entrega-planes.md).

Zona 24: [Alta privada de barberia](31-owner-alta/entrega-alta.md).

Zona 25: [Mensajes owner](32-owner-mensajes/entrega-mensajes.md).

Revisar identidad oscura propuesta y dos superficies insignia (13 y 14). Despues armar plan detallado del primer lote y preview; aprobacion visual basada en pantallas concretas antes de desplegar cambios compartidos.

## Verificacion del paquete

- 34 specs y este indice; las 41 rutas page.tsx actuales tienen cobertura.
- Referencias a archivos actuales verificadas; enlaces internos sin roturas.
- npm run build: correcto, incluidos TypeScript y generacion de paginas.
- npm run lint: detenido por EPERM al recorrer .gstack, carpeta de herramientas.
- npm run lint -- --ignore-pattern '.gstack/**': correcto sin errores; un warning previo en scripts/test-crm-export.ts (toUsageRecords sin uso).
- Persisten avisos de deprecacion de Sentry durante build; no se modifico configuracion ajena al alcance.
- No se ejecutaron pruebas visuales/E2E ni se hicieron cambios en pantallas, datos, SQL, planes o dependencias. La validacion anterior comprueba documentacion y build, no el rediseño aun pendiente.
