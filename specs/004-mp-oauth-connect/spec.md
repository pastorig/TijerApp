# Spec: Conectar MercadoPago con un clic (OAuth)

**Branch**: `004-mp-oauth-connect` (sobre `003-mp-deposit-checkout`)
**Created**: 2026-06-25
**Status**: Draft

## Objetivo

Que un barbero conecte su cuenta de MercadoPago **sin cargar tokens ni variables a mano**: toca "Conectar con MercadoPago", inicia sesión en MP, autoriza, y vuelve conectado. TijerApp obtiene y guarda las credenciales por OAuth.

## User story

Un dueño de barbería, en `/<slug>/admin/cobros`, toca **"Conectar con MercadoPago"** → lo lleva al login de MP → autoriza → vuelve a TijerApp con la cuenta **conectada**. A partir de ahí puede activar el cobro de seña (feature 003). El dinero va directo a su cuenta de MP.

## Cómo funciona (OAuth de MercadoPago)

- TijerApp tiene **una** aplicación de MP (la de la plataforma) con `client_id` + `client_secret`, cargados **una vez** como env vars (`MP_CLIENT_ID`, `MP_CLIENT_SECRET`). El barbero nunca los ve.
- Flujo: botón → `GET /authorization` de MP (con `state` firmado que identifica la barbería) → MP redirige a `/api/mp/oauth/callback?code=&state=` → TijerApp intercambia el `code` por `access_token` + `refresh_token` + `public_key` + `user_id` (POST `/oauth/token`) → guarda en la barbería.
- El access_token vence (~180 días) → se renueva con el `refresh_token` on-demand antes de usarlo.

## Requisitos

- **FR-001**: Botón "Conectar con MercadoPago" en `/admin/cobros` cuando la barbería NO está conectada (sin `mp_user_id`).
- **FR-002**: Iniciar el OAuth requiere ser admin de la barbería; el `state` va firmado (HMAC) con la barbería + vencimiento corto, para que el callback confíe en a qué barbería corresponde sin sesión.
- **FR-003**: El callback intercambia el code, guarda `mp_access_token`, `mp_refresh_token`, `mp_public_key`, `mp_user_id`, `mp_token_expires_at`, y redirige a `/<slug>/admin/cobros?mp=connected`.
- **FR-004**: Conectar la cuenta NO activa la seña automáticamente; el barbero la activa con el toggle existente (feature 003). Conectar solo guarda credenciales.
- **FR-005**: Cuando esté conectada, la UI muestra "Conectado" (con el nick/ID de MP) + botón **Desconectar** (limpia las credenciales MP de la barbería).
- **FR-006**: Antes de usar el access_token (crear preference), si está vencido o por vencer, renovarlo con el refresh_token y persistir el nuevo.
- **FR-007**: La carga manual de Access Token queda como **fallback opcional** (colapsado), no como camino principal.
- **FR-008**: `client_secret` y los tokens nunca se exponen al cliente.

## Decisiones (defaults)

- `state` = `base64url(slug + "." + expMs)` + "." + HMAC-SHA256 con `MP_CLIENT_SECRET`. Sin tabla nueva.
- `redirect_uri` = `${origin}/api/mp/oauth/callback` derivado del host del request (funciona en preview y prod). Debe estar registrado en la app de MP.
- Refresh on-demand (no cron): el token dura 180 días, rara vez hace falta.
- DB: agregar a `barbershops` las columnas `mp_refresh_token text` y `mp_token_expires_at timestamptz` (las otras mp_* ya existen). Migración aditiva.

## Out of scope

- Split de comisión a TijerApp (el 100% va a la barbería).
- Onboarding de la app de plataforma (lo hace Bautista una vez en MP).
- Refresh por cron (se hace on-demand).

## Verificación

- lint + build verdes.
- Smoke: botón conectar arma la URL correcta; callback con state válido guarda credenciales; state inválido/expirado rechaza; desconectar limpia; refresh renueva.
