# Contract: POST /api/registro/google

Crea la barbería de una persona que entró con Google y todavía no tiene ninguna (alta pendiente).

## Request

- Header: `Authorization: Bearer <access_token de Supabase>` (la sesión recién abierta con Google).
- Body JSON:

```json
{ "barbershopName": "Olgiati", "ownerName": "Juan Olgiati", "whatsapp": "3571 566221" }
```

El mail **no** viaja en el body: sale de `getUser()` sobre el token.

## Reglas

1. Token inválido o vencido → `401 { ok: false, error: "Tu sesión venció. Volvé a entrar con Google." }`.
2. El usuario no tiene identidad `google` o su mail no está verificado → `403`.
3. Rate limit con el bucket `registro` (mismo límite que `/api/registro`) → `429` + `Retry-After`.
4. Validación de campos igual que `/api/registro` → `400` con el mensaje en castellano.
5. Si el usuario ya administra una barbería → `200 { ok: true, slug: "<la que ya tiene>" }` sin crear otra
   (idempotente: doble toque, volver atrás).
6. Si no → `provisionBarbershop` con el mail del token, sin clave (encuentra al usuario por mail y no
   le crea ni le cambia la clave). Mismos datos por defecto que el registro de hoy: link derivado del
   nombre, prueba de 14 días, mail obligatorio para reservar prendido, aviso de alta al owner.

## Response

```json
{ "ok": true, "slug": "olgiati" }
```

El cliente hace `router.replace("/<slug>/admin")`.

## Sin cambios

- `POST /api/registro` (mail + clave) queda igual.
- Ningún endpoint de `/api/admin/*` ni `/api/staff/*` cambia: siguen validando el token y buscando
  accesos por `user_id`.
