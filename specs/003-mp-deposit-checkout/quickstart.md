# Quickstart / QA: Cobro de seña con MercadoPago (sandbox)

**Feature**: 003-mp-deposit-checkout

## Pre-requisitos (los hace Bautista)

1. En MercadoPago (cuenta del vendedor de prueba), obtener credenciales **TEST**: Access Token y Public Key.
2. En el panel de TijerApp de la barbería de prueba (`/<slug>/admin/cobros`): pegar el Access Token TEST, activar el cobro de seña, setear % (ej 30), mínimo (opcional) y horas de auto-cancelación (para QA, **1 hora**).
3. La app tiene que estar **deployada** (Vercel) para que el webhook tenga URL pública. `CRON_SECRET` y `NEXT_PUBLIC_SITE_URL` configurados en Vercel.

## Flujo feliz (pago aprobado)

1. Ir a `/<slug>/reservar`, reservar un turno.
2. Verás una pantalla con el **monto de seña** y el botón **"Pagar seña"**. Verificar que el monto = max(precio×%, mínimo).
3. Click → checkout de MP (TEST). Pagar con **tarjeta de prueba APRO** (aprobada).
4. Volvés a `/r/<token>`: el turno figura **confirmado** y **"seña pagada"** (en < 1 min, cuando llega el webhook).
5. En el turnero admin, el turno muestra badge **"seña pagada"**.

## Flujo de expiración (no paga)

1. Reservar (con auto-cancel en 1h para QA) y **no pagar**.
2. Forzar el cron: `GET /api/cron/deposits?force=true` con `Authorization: Bearer <CRON_SECRET>`.
3. El turno queda **cancelado**, el horario **libre** de nuevo, estado **"expirada"**.

## Casos borde a chequear

- **Mínimo**: servicio barato donde el % < mínimo → cobra el mínimo.
- **Rechazo**: tarjeta de prueba OTHE → turno sigue pendiente, se puede reintentar con el mismo link.
- **Webhook duplicado**: reenviar la notificación → el turno NO se confirma dos veces (sin `payment_events` duplicado de `payment_approved`).
- **Sin seña**: barbería con `mp_enabled=false` → la reserva no muestra ningún paso de pago (idéntico a hoy).
- **Token inválido**: poner un Access Token roto → al reservar, mensaje claro de error (no turno fantasma).

## Verificación técnica

- `npm run lint` y `npm run build` limpios.
- Unit del helper `computeDepositAmount` (porcentaje, mínimo, redondeo).
- Revisar `payment_events` en la DB: un row por paso del ciclo.

## Tarjetas de prueba MP (referencia)

- Aprobada: nombre del titular **APRO**.
- Rechazada por fondos: **OTHE** / **FUND**.
- (Números de tarjeta de prueba según la doc oficial de MP por país AR.)
