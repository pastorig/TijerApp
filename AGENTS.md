# AGENTS.md

## Reglas generales del proyecto

Este proyecto es un SaaS de turnos para barberias. SV Barber es solo el primer cliente/demo y no debe condicionar la arquitectura general.

- Usar TypeScript en todo el codigo.
- Usar Next.js con App Router.
- Usar Tailwind CSS para estilos.
- Mantener la estructura `src/` limpia y predecible.
- Crear componentes reutilizables cuando una pieza de UI pueda repetirse.
- Evitar hardcodear logica especifica de SV Barber.
- Pensar siempre en un modelo multi-barberia.
- Mantener el codigo escalable, claro y facil de modificar.
- Separar UI, logica de negocio y datos.
- Evitar duplicacion de codigo.
- Priorizar claridad, mantenimiento y buenas practicas por encima de soluciones rapidas.
- No agregar dependencias innecesarias.
- No implementar integraciones nuevas hasta que esten definidas en una fase concreta.

## Skills esperadas del agente

### Next.js Specialist

- Responsabilidades: definir rutas con App Router, Server Components, Client Components, metadata y convenciones de Next.js.
- Cuando aplicarla: al crear o modificar rutas publicas, paneles, layouts, navegacion, carga de datos y builds.
- Buenas practicas: mantener `params` tipados correctamente, usar `notFound()` para slugs invalidos, evitar logica innecesaria en paginas y reutilizar componentes compartidos.

### Supabase Specialist

- Responsabilidades: configurar el cliente Supabase, consultas, inserts, errores, variables de entorno y reglas basicas de acceso.
- Cuando aplicarla: al leer o guardar reservas, conectar tablas, revisar errores de Supabase o preparar futuras integraciones con auth.
- Buenas practicas: no exponer claves privadas, usar solo publishable key en cliente, manejar errores visualmente y validar que RLS permita unicamente lo necesario.

### Database Architect

- Responsabilidades: modelar entidades, columnas, relaciones, indices, restricciones y estados de negocio.
- Cuando aplicarla: al tocar tablas como `appointments`, agregar barberias, servicios, barberos, clientes o reglas de disponibilidad.
- Buenas practicas: pensar multi-barberia desde el modelo, indexar `barbershop_slug`, `appointment_date` y `appointment_time`, y evitar columnas atadas a un solo cliente demo.

### SaaS Architect

- Responsabilidades: proteger la vision multi-tenant, separar configuracion por barberia y evitar acoplamientos a SV Barber.
- Cuando aplicarla: al disenar nuevas funcionalidades, paneles, planes, permisos o datos configurables por cliente.
- Buenas practicas: no crear forks por barberia, usar slugs/configuracion, separar dominio de UI y mantener integraciones desacopladas.

### UI/UX Designer

- Responsabilidades: cuidar experiencia mobile-first, jerarquia visual, formularios, estados y accesibilidad basica.
- Cuando aplicarla: al crear o ajustar landing, reserva, panel admin y cualquier flujo publico.
- Buenas practicas: botones tactiles grandes, formularios claros, estados de loading/error/vacio, buen contraste y diseno premium/minimalista.

### Security Reviewer

- Responsabilidades: revisar exposicion de datos, permisos, RLS, variables de entorno, rutas admin y operaciones sensibles.
- Cuando aplicarla: antes de publicar rutas admin, inserts publicos, integraciones externas o datos personales.
- Buenas practicas: asumir que toda ruta publica puede ser visitada, no confiar en el cliente, preparar auth antes de datos sensibles reales y documentar riesgos temporales.

### QA Tester

- Responsabilidades: verificar lint, build, flujos principales, estados vacios, errores y responsive.
- Cuando aplicarla: antes de cerrar cambios o cuando se modifique reserva, admin, datos o navegacion.
- Buenas practicas: ejecutar `npm run lint` y `npm run build`, probar slugs validos/invalidos y revisar que WhatsApp solo abra despues de guardar.

### Git Assistant

- Responsabilidades: revisar estado del repo, preparar commits limpios y evitar pisar cambios ajenos.
- Cuando aplicarla: antes de commitear, crear ramas, resolver conflictos o revisar cambios pendientes.
- Buenas practicas: usar comandos no interactivos, no revertir cambios no solicitados y mantener commits enfocados.

### WhatsApp Integration Helper

- Responsabilidades: generar links `wa.me`, formatear mensajes y mantener la integracion demo separada de la UI.
- Cuando aplicarla: al modificar confirmaciones, mensajes, telefonos o futura WhatsApp API.
- Buenas practicas: limpiar numeros, usar `encodeURIComponent`, no abrir WhatsApp si falla Supabase y preparar una capa separada para API real futura.

### Google Calendar Integration Helper

- Responsabilidades: preparar futura sincronizacion de turnos con calendarios externos.
- Cuando aplicarla: cuando se implemente agenda, bloqueo de horarios, eventos o recordatorios.
- Buenas practicas: no implementarlo antes de definir auth/permisos, mantenerlo desacoplado y tratar fallas de calendario como integracion externa recuperable.

## Arquitectura esperada

- La UI debe vivir en componentes pequenos y enfocados.
- La logica de negocio debe estar separada de los componentes visuales.
- Los datos demo deben poder reemplazarse luego por datos de base de datos sin reescribir la interfaz.
- Cualquier referencia a servicios, precios, horarios, barberos o datos de contacto debe modelarse pensando en multiples barberias.
- Las futuras integraciones externas deben aislarse en modulos propios cuando sean implementadas.
- Evitar mezclar reglas de reserva, renderizado y persistencia en un mismo archivo.

## Reglas de diseno

- El diseno debe ser responsive de forma obligatoria.
- La implementacion debe ser mobile-first.
- Debe funcionar correctamente en celular, tablet, notebook y PC.
- Los botones deben ser grandes, claros y comodos para uso tactil.
- Los formularios futuros deben estar optimizados para movil.
- El estilo visual debe sentirse moderno, minimalista y premium.
- La estetica debe alinearse con barberias modernas: sobria, elegante, directa y confiable.
- Evitar interfaces recargadas, textos innecesarios o patrones visuales genericos.
- Mantener buena legibilidad, contraste y jerarquia visual.

## Restricciones actuales

Implementado en fase demo:

- Landing publica multi-barberia por slug.
- Formulario de reserva.
- Guardado de reservas en Supabase.
- Apertura de WhatsApp mediante link `wa.me`.
- Panel admin basico sin autenticacion.

Por ahora no implementar:

- Autenticacion.
- Google Calendar.
- Pagos online.
- Bloqueo de horarios.
- Panel multi-barbero.
- WhatsApp API real.

Riesgo temporal: el panel admin es publico hasta que se implemente autenticacion y politicas RLS adecuadas.

## Criterios antes de finalizar cambios

- Verificar que el proyecto compile correctamente.
- Ejecutar lint cuando haya cambios de codigo.
- No modificar funcionalidades existentes si la tarea solo pide documentacion.
- Mantener los cambios acotados al objetivo solicitado.
