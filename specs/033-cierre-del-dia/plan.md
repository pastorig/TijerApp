# Plan: Cierre automático del día y pedido de reseña

**Spec**: [spec.md](./spec.md) · **Fecha**: 2026-10-04 · **Migración**: una, chica (la corre Bautista).

## Idea central

Un cron nuevo, cada hora, con dos pasos independientes:

1. **Cerrar**: los pendientes con fecha anterior a hoy (Argentina) pasan a `confirmed`.
   Es un `update` directo con el service role: no pasa por el código que avisa al
   cliente, y en la base el único trigger de UPDATE es el de fidelización, que es
   justo el efecto que se quiere (FR-005).
2. **Pedir reseña**: entre las 10 y las 13, a los turnos de AYER confirmados con mail.

Las decisiones (qué se cierra, a quién se le pide) viven en funciones puras con tests;
la ruta solo lee, decide con esas funciones y escribe.

## Piezas

### `src/lib/cierre-del-dia.ts` (puro, con tests)

- `debeCerrarse(turno, hoy)`: pendiente + fecha < hoy + sin seña impaga.
- `enVentanaDeResena(hora)`: 10 ≤ hora < 13.
- `diaAnterior(ymd)`.
- `elegirPedidosDeResena({ turnos, conResena, yaPedidos, pedidosRecientes,
  barberiasEnLectura })`: devuelve a quién sí y, para cada descartado, por qué.
  Deduplica dentro de la misma pasada (dos turnos del mismo cliente ayer = un mail).
- Constantes: `AUTOR_CIERRE = "Cierre automático"`, `DIAS_ENTRE_PEDIDOS = 90`.

### `src/lib/server/review-request-email.ts`

El mail, por Resend, con `X-Entity-Ref-ID` único (mismo motivo que el de recuperar
contraseña: Gmail colapsa los repetidos). Un botón → `/rev/<token>`, que ya existe.

### `GET /api/cron/cierre`

- Bearer `CRON_SECRET`, igual que los otros crons.
- `?dryRun=true`: informa qué cerraría y a quién le pediría, sin escribir ni mandar.
- `?force=true`: ignora la ventana horaria de las reseñas (para probar).
- **Cerrar**: trae ids, filtra con `debeCerrarse`, actualiza de a tandas con
  `.in("id", …).eq("status", "pending")` — el `eq` hace que una pasada repetida o un
  turno que el barbero tocó en el medio no se pise.
- **Reseñas, "reclamar antes de mandar"**: primero se inserta el renglón en
  `reminder_log` (`kind = 'review_request'`); solo si entra se manda el mail. El índice
  único `(appointment_id, kind, channel)` hace imposible el doble envío, y si la
  migración no se corrió el insert falla y **no sale ningún mail** (en vez de salir uno
  por hora para siempre). Si Resend falla, el renglón pasa a `failed` y la próxima
  pasada dentro de la ventana reintenta.

### `.github/workflows/cierre-cron.yml`

Cada hora, minuto 20 (los otros usan 5 y 10). Mismos secretos.

### Migración `20261004120000_reminder_log_review_request.sql`

Suma `'review_request'` al CHECK de `reminder_log.kind`.

## Lo que NO se toca

Las pantallas (visitas, reportes, cierre de caja ya tratan confirmado + fecha pasada como
visita) y el flujo de cancelar con "Cliente no vino". `AppointmentRow` ya muestra
"Confirmado por <nombre>": con `status_changed_by_name = "Cierre automático"` FR-101
sale solo.

## Riesgos

- **Cerrar de más.** El filtro es estrecho (pendiente + fecha pasada + sin seña impaga)
  y está testeado; antes de prender el cron se corre `dryRun` contra prod y se compara
  con los 233 medidos.
- **Mandar mails de más.** Ventana de 3 horas, solo turnos de ayer, uno por turno por
  índice único, uno cada 90 días por cliente, y reclamar-antes-de-mandar.
- **Correr el cron en local pega contra prod** (ya pasó): `dryRun` es el modo por
  defecto para probar; nunca `force` sin `dryRun` desde la máquina.

## Verificación

- Tests unitarios de las funciones puras.
- `dryRun` contra prod: tiene que listar 233 turnos (216 de `barber`) y 0 con seña.
- Tras el deploy: una corrida manual del workflow y consulta de pendientes pasados = 0.
