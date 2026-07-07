# Contract: `POST /api/owner/register-payment`

**Auth**: owner. Header `Authorization: Bearer <access_token>` del owner (mismo patrón que `POST /api/owner/plans` / `reset-barbershop-admin`). Se valida que el token corresponda al owner del SaaS; si no, `401`.

## Request

```jsonc
{
  "slug": "prime-barber",     // barbershop_slug (requerido)
  "amount": 41000,            // number >= 0, ARS (requerido; prefill = PLAN_META[tier].priceArs)
  "method": "transferencia",  // "transferencia" | "efectivo" | "otro" (requerido)
  "paidAt": "2026-07-07",     // ISO date opcional (default: hoy). Solo informativo/nota; la vigencia se calcula server-side.
  "note": "Transferencia Naranja X"  // opcional
}
```

## Server logic

1. Validar owner (401 si no).
2. Validar payload (400 si `slug` vacío, `amount` inválido, `method` fuera del enum).
3. Leer `pagado_hasta` actual de `barbershop_subscriptions` (404 si no existe la barbería/sub).
4. `periodStart = max(now, pagado_hasta ?? now)`; `periodEnd = addMonths(periodStart, 1)`.
5. Llamar RPC `register_barbershop_payment(...)` → insert pago + update sub (`pagado_hasta=periodEnd`, `status='active'`) atómico.
6. Responder.

## Responses

- **200**
  ```json
  { "ok": true, "pagadoHasta": "2026-08-07T...Z", "payment": { "id": "...", "amount": 41000, "method": "transferencia", "periodStart": "...", "periodEnd": "..." } }
  ```
- **400** `{ "error": "Datos inválidos: <detalle>" }`
- **401** `{ "error": "No autorizado" }`
- **404** `{ "error": "No encontramos esa barbería" }`
- **500** `{ "error": "No pudimos registrar el pago. Probá de nuevo." }`

Errores en español rioplatense, sin filtrar internals.
