# Specification: Push Notifications

**Branch**: `002-push-notifications`
**Created**: 2026-06-04
**Status**: Draft
**Input**: Push notifications para TijerApp. Reservas nuevas disparan notificación al barbero en tiempo real ("Nueva reserva: Juan, hoy 18:30 con Carlos") sin tener que abrir el panel admin. Multi-tenant: cada barbería con sus propias subscriptions. Para clientes finales: opt-in para recibir notificación cuando el admin confirma su reserva. Sin SMS, sin email push (eso ya está via Resend), sin recordatorios programados (otro feature).

## User Scenarios & Testing

### Primary User Story

Un barbero está cortando el pelo de un cliente. Su celular vibra con una notificación: **"Nueva reserva: Juan Pérez, hoy 18:30 con Carlos"**. No tiene que dejar de cortar ni abrir TijerApp — sabe en tiempo real que entró un turno y puede planear el resto del día mentalmente. Al terminar el corte, abre el panel y confirma.

### Acceptance Scenarios

1. **Given** un admin logueado con la PWA TijerApp instalada en su mobile, **When** entra a Settings y activa "Notificaciones push", **Then** el browser pide permiso y, si lo concede, queda suscripto y ve el estado "Notificaciones activas" en el panel.

2. **Given** un admin con notificaciones activas, **When** un cliente reserva un turno público en `/sv-barber/reservar`, **Then** dentro de los próximos 60 segundos recibe una notificación en su mobile con: nombre del cliente, hora del turno y nombre del barbero asignado.

3. **Given** un admin que recibe una notificación, **When** la toca, **Then** se abre la PWA TijerApp directamente en la página del Turnero (no en el home).

4. **Given** un admin con notificaciones activas, **When** entra a Settings y desactiva "Notificaciones push", **Then** el sistema borra su subscription y deja de mandarle notificaciones (incluso de turnos que entran después).

5. **Given** un cliente final con la PWA instalada que aceptó notificaciones al reservar, **When** el admin confirma su turno desde el panel, **Then** el cliente recibe una notificación "Tu turno fue confirmado".

6. **Given** una barbería con 2 admins (ambos con notificaciones activas), **When** entra una reserva nueva, **Then** AMBOS reciben la notificación (no solo uno).

7. **Given** un admin de SV Barber y un admin de AG Barber, **When** entra una reserva en SV Barber, **Then** SOLO el admin de SV Barber recibe la notificación. El de AG Barber no se entera.

### Edge Cases

- **Browser sin soporte de Web Push** (Safari < 16.4 en iOS, navegadores in-app): el botón "Activar notificaciones" debe explicar por qué no está disponible en lugar de fallar silenciosamente.
- **Usuario rechaza el permiso del browser**: mensaje claro "Permitilo desde la configuración del browser" + link a instrucciones, sin re-intentar el prompt automáticamente.
- **iOS Safari requires la PWA instalada**: si el admin está en Safari sin tener la PWA agregada al home screen, el botón debe explicar primero que instale la PWA y después active notificaciones.
- **Subscription expira o el browser la invalida**: el sistema detecta el 410 Gone del endpoint Web Push, marca la subscription como expirada y deja de intentar enviarle.
- **Admin cierra sesión**: las subscriptions sobreviven al logout (van por device, no por session) — pero al iniciar sesión como otro user en el mismo browser, el admin debería poder "reclamarlas" o ser preguntado.
- **Múltiples devices del mismo admin** (celular + tablet + desktop): cada device es una subscription independiente. Si activa notif en 3 devices, recibe la notif en los 3.
- **Cliente borra la PWA**: la subscription queda huérfana en DB; el sistema la limpia en su próximo intento (410 Gone).
- **Cron falla o se atrasa**: hay un máximo de retraso aceptable (≤2 min) antes de que la notificación pierda relevancia para el barbero.
- **Notification spam**: si entran 5 reservas en 1 minuto, manda 5 notifs separadas — el barbero quiere saber cada una individualmente, no agrupadas.

## Functional Requirements

### Must Have (MVP — admin notifications)

- **FR-001**: El admin de una barbería puede activar/desactivar notificaciones push desde el panel admin (botón visible en Settings o en el sidebar).
- **FR-002**: Activar notificaciones requiere conceder permiso del browser. Si el usuario rechaza, el sistema muestra instrucciones para habilitarlo manualmente desde la configuración del browser.
- **FR-003**: Una vez suscripto, el admin recibe una notificación push dentro de los **60 segundos** de que entra una reserva nueva en su barbería.
- **FR-004**: La notificación incluye: título "Nueva reserva", cuerpo con el nombre del cliente + hora del turno + nombre del barbero asignado.
- **FR-005**: Al tap en la notificación, se abre la PWA (o el browser si no está instalada) directamente en el Turnero del admin (no en el home global).
- **FR-006**: Cada admin puede tener múltiples devices suscriptos (mobile + desktop + tablet). Las notificaciones se mandan a TODOS los devices.
- **FR-007**: Las subscriptions son aisladas por `barbershop_slug`. Un admin solo recibe notificaciones de las barberías de las que es admin.
- **FR-008**: Si la subscription del usuario se invalida (browser la borra, expira, etc.), el sistema la marca como inválida y deja de intentar enviarle automáticamente — sin requerir acción del admin.
- **FR-009**: Desactivar notificaciones borra la subscription del device actual. Otros devices del mismo admin siguen recibiendo si están activos.

### Should Have

- **FR-101**: Notification para el cliente final cuando su reserva es **confirmada** por el admin: título "Turno confirmado", cuerpo "Tu turno con [Barbero] el [Fecha] [Hora] está confirmado". Solo si el cliente: (a) instaló la PWA de la barbería, (b) hizo opt-in en el flujo de reserva.
- **FR-102**: Un toggle por barbería en Settings para deshabilitar globalmente notificaciones (override para toda la barbería). Default ON.
- **FR-103**: Indicador visual en el panel admin cuando hay notificaciones activas (badge o texto: "Notificaciones activas en 2 devices").
- **FR-104**: Permitir al admin probar las notificaciones con un botón "Mandarme una de prueba" que dispara una notificación inmediata sin esperar reserva.

### Won't Have (out of scope)

- **SMS push** — out of scope, usamos solo Web Push.
- **Email push** — ya está cubierto por Resend en otro feature.
- **Recordatorios programados de turnos del día** — feature aparte (mañana a la mañana mandar "Hoy tenés 8 turnos").
- **Notificaciones de cancelación** — fase posterior si los barberos lo piden; por ahora solo "nueva reserva" + "confirmada al cliente".
- **Sonidos custom** — usamos el sonido default del sistema.
- **Acciones en la notificación** (botones tipo "Confirmar"/"Cancelar" desde la notif sin abrir la app) — requiere arquitectura más compleja, fase posterior.
- **Web Push para platform owner** — el owner de TijerApp no necesita notif por cada reserva de cada barbería, sería ruido.

## Success Criteria

- **SC-001**: 70% de los barberos demo (en pruebas internas) activan las notificaciones en su primer login con la PWA instalada.
- **SC-002**: La latencia entre que entra una reserva pública y el admin recibe la notificación es **≤ 60 segundos en el 95% de los casos**.
- **SC-003**: La tasa de entrega (notif que llegan al device del usuario sobre las que se intentan mandar) es **≥ 95%** en condiciones normales de red.
- **SC-004**: La tasa de fallo (subscriptions inválidas que el sistema NO logra detectar como tales) es **≤ 1%** — casi todas las invalidas se detectan en el primer intento y se limpian.
- **SC-005**: Cero notificaciones cross-barbería en testing (un admin de SV Barber NUNCA recibe una notif de AG Barber).
- **SC-006**: La PWA de TijerApp puede recibir notifs cuando está cerrada/background en Android Chrome, iOS Safari ≥ 16.4 instalada, y desktop Chrome/Brave/Firefox.

## Assumptions

- **Web Push API con VAPID self-signed keys**: usamos el estándar de Web Push (no FCM ni APN propios), generando las VAPID keys una vez al hacer el setup y guardándolas como env vars. Razón: simple, no requiere cuenta Firebase, funciona en TODOS los browsers modernos.
- **Subscriptions persistidas en Supabase**: una tabla `push_subscriptions` con `barbershop_slug`, `user_id` (admin) o `phone_normalized` (cliente final), `endpoint`, `keys` (p256dh + auth), `created_at`, `last_used_at`, `expired_at` (nullable, marca cuando se detecta inválida).
- **Trigger automático al insert de appointment**: usamos un Postgres trigger en la tabla `appointments` que inserta un row en una tabla `notification_queue` para cada admin suscripto a esa barbería. Razón: garantiza atomicidad — si falla el insert del appointment, no se manda notif.
- **Cron processor cada 30-60 segundos**: una Vercel cron route lee `notification_queue`, manda las notifs pendientes via Web Push library, y marca cada row como `sent` o `failed`.
- **Latencia objetivo**: < 60 seg p95 — viable con cron cada 30s + processing batch chico.
- **Browser compatibility check**: hacemos feature detection (`'PushManager' in window`) antes de mostrar el botón "Activar notificaciones". Si no soporta, mostramos mensaje explicativo.
- **No retry agresivo**: si un push falla con 410 Gone (subscription expirada), marcamos como inválida y no reintentamos. Otros errores transitorios (5xx) reintentamos hasta 3 veces con backoff.
- **Privacy**: el contenido de la notif (nombre del cliente, hora) viaja encriptado de extremo a extremo en el protocolo Web Push — los servidores intermedios solo ven metadata.

## Dependencies

- **PWA infrastructure ya existente** (manifest, service worker, install flow) — feature 001-pwa-installable.
- **Service Worker** debe agregarse handler para `push` event (recibir y mostrar notificación) y `notificationclick` (handle del tap).
- **Supabase**: tablas nuevas `push_subscriptions` y `notification_queue`, trigger en `appointments`, RLS policies estrictas (un admin solo ve sus propias subscriptions; el processor usa service role).
- **Vercel cron**: una nueva route en `/api/cron/process-push-queue` configurada para correr cada 30-60s.
- **Library**: una librería server-side para firmar y enviar Web Push messages (estándar).
- **VAPID keys**: nuevas env vars en Vercel para public key (expuesta al client) y private key (server only).

## Key Entities

- **PushSubscription**: representa un device suscripto a notificaciones. Atributos clave: barbershop_slug, identidad del usuario (admin via user_id o cliente via phone_normalized), endpoint URL del push service, keys de cifrado (p256dh + auth), timestamps de creación/uso/expiración.
- **NotificationQueueItem**: una notificación pendiente de enviar. Atributos: tipo (new_reservation | confirmation), referencia a la subscription destino, payload (título + cuerpo + URL al tap), status (pending | sent | failed | invalid), retry_count, timestamps.

## Next Steps

- Si quedan ambigüedades en las asunciones documentadas → run **speckit-clarify**.
- Si las asunciones son aceptables → run **speckit-plan** para diseñar implementación técnica (library exacta, schema SQL, flow del cron, etc.).
