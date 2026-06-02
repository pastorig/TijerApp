# AGENTS.md

## Reglas generales del proyecto

Este proyecto se llama TijerApp. Es un SaaS de turnos para barberias. SV Barber es solo el primer cliente/demo y no debe condicionar la arquitectura general.

- Usar TypeScript en todo el codigo.
- Usar Next.js con App Router.
- Usar Tailwind CSS para estilos.
- Mantener la estructura `src/` limpia y predecible.
- Crear componentes reutilizables cuando una pieza de UI pueda repetirse.
- Evitar hardcodear logica especifica de SV Barber.
- Pensar siempre en multi-barberia y multi-barbero.
- Mantener el codigo escalable, claro y facil de modificar.
- Separar UI, logica de negocio, datos e integraciones.
- Evitar duplicacion de codigo.
- No agregar dependencias innecesarias.
- No implementar features fuera de fase.

## Arquitectura TijerApp

- La home `/` pertenece a TijerApp, no a una barberia cliente.
- Las paginas publicas de barberia viven en `/[barbershopSlug]`.
- Las reservas publicas viven en `/[barbershopSlug]/reservar`.
- El admin de barberia vive en `/[barbershopSlug]/admin`.
- El login admin vive en `/[barbershopSlug]/admin/login`.
- En esta fase hay un login admin por barberia.
- En el futuro existira un panel owner para el dueno de TijerApp.
- SV Barber debe permanecer como demo en datos, no como marca principal.

## Skills esperadas del agente

### Next.js Specialist

- Responsabilidades: definir rutas con App Router, Server Components, Client Components, metadata y navegacion.
- Cuando aplicarla: al crear o modificar home, rutas por slug, login, admin, paginas publicas y builds.
- Buenas practicas: mantener `params` tipados, usar `notFound()` para slugs invalidos, empujar `use client` lo mas abajo posible y reutilizar componentes.

### Supabase Specialist

- Responsabilidades: configurar cliente Supabase, consultas, inserts, updates, errores, auth y variables de entorno.
- Cuando aplicarla: al leer o guardar reservas, confirmar, cancelar, bloquear horarios o revisar login.
- Buenas practicas: no exponer claves privadas, manejar errores visuales, respetar RLS y no abrir WhatsApp si falla un guardado requerido.

### Database Architect

- Responsabilidades: modelar entidades, columnas, relaciones, indices, restricciones y estados.
- Cuando aplicarla: al tocar `appointments`, barberias, barberos, servicios, disponibilidad o futuros planes.
- Buenas practicas: bloquear turnos activos por `barbershop_slug`, `barber_id`, fecha y hora; indexar consultas frecuentes; evitar columnas atadas a SV Barber.

### SaaS Architect

- Responsabilidades: proteger la vision multi-tenant y separar plataforma de cliente.
- Cuando aplicarla: al modificar home, slugs, admin, login, datos demo o futuras funcionalidades owner.
- Buenas practicas: no crear forks por barberia, usar configuracion por cliente, mantener TijerApp como marca de plataforma y SV Barber como demo.

### UI/UX Designer

- Responsabilidades: cuidar experiencia mobile-first, jerarquia visual, formularios, estados y accesibilidad basica.
- Cuando aplicarla: al ajustar landing, reserva, login, admin y flujos publicos.
- Buenas practicas: botones tactiles, formularios compactos, estados claros, contraste alto y estetica premium/minimalista.

### Security Reviewer

- Responsabilidades: revisar exposicion de datos, permisos, RLS, variables de entorno, rutas admin y acciones sensibles.
- Cuando aplicarla: antes de publicar rutas admin, inserts publicos, auth, cancelaciones, confirmaciones o datos personales.
- Buenas practicas: no confiar solo en el cliente, validar estados, preparar permisos por barberia y documentar riesgos temporales.

### QA Tester

- Responsabilidades: verificar lint, build, flujos principales, estados vacios, errores y responsive.
- Cuando aplicarla: antes de finalizar cambios en reserva, admin, login, datos, documentacion o navegacion.
- Buenas practicas: ejecutar `npm run lint` y `npm run build`, probar slugs validos/invalidos y revisar que las acciones no mezclen responsabilidades.

### Git Assistant

- Responsabilidades: revisar estado del repo, preparar commits limpios y evitar pisar cambios ajenos.
- Cuando aplicarla: antes de commitear, crear ramas, resolver conflictos o revisar cambios pendientes.
- Buenas practicas: usar comandos no interactivos, no revertir cambios no solicitados y mantener commits enfocados.

### WhatsApp Integration Helper

- Responsabilidades: generar links `wa.me`, formatear mensajes y mantener la integracion demo separada de la UI.
- Cuando aplicarla: al modificar mensajes de reserva, confirmacion, telefonos o futura WhatsApp API.
- Buenas practicas: limpiar numeros, usar `encodeURIComponent`, separar enviar WhatsApp de confirmar estado y preparar API real desacoplada.

### Google Calendar Integration Helper

- Responsabilidades: preparar futura sincronizacion de turnos con calendarios externos.
- Cuando aplicarla: cuando se implemente agenda externa, eventos, recordatorios o bloqueo sincronizado.
- Buenas practicas: no implementarlo antes de definir auth/permisos, mantenerlo desacoplado y tratar fallas como integracion externa recuperable.

## Reglas de diseno

- Responsive obligatorio.
- Mobile-first.
- Debe funcionar correctamente en celular, tablet, notebook y PC.
- Botones grandes y comodos para tactil.
- Formularios optimizados para movil.
- Admin compacto para uso durante el trabajo.
- Diseno moderno, minimalista y premium.
- Estetica sobria de barberia moderna.
- No usar textos innecesarios dentro de la app.
- Mantener buena legibilidad, contraste y jerarquia.

## Restricciones actuales

Implementado actualmente:

- Home general de TijerApp.
- Landing publica multi-barberia por slug.
- Formulario de reserva por slug.
- Guardado de reservas en Supabase.
- Bloqueo de horarios ocupados por barbero.
- Multi-barbero en datos y reservas.
- WhatsApp demo mediante link `wa.me`.
- Login admin con Supabase Auth.
- Panel admin por barberia.
- Confirmacion, cancelacion y envio separado de WhatsApp.

Por ahora no implementar:

- Panel owner.
- Registro de barberias.
- Gestion visual de barberos.
- Roles avanzados.
- Google Calendar.
- Pagos online.
- WhatsApp API real.

## Criterios antes de finalizar cambios

- Ejecutar `npm run lint`.
- Ejecutar `npm run build`.
- Corregir errores si aparecen.
- Mantener compatibilidad con `/sv-barber`, `/sv-barber/reservar`, `/sv-barber/admin` y `/sv-barber/admin/login`.
- No romper reservas, Supabase, WhatsApp, admin, login, cancelacion, horarios ocupados ni multi-barbero.
