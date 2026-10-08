# Tasks: 035 catálogo de productos en la reserva

Preguntas abiertas resueltas el 8/10/2026 (ver spec).

## Etapa A — El dueño carga su catálogo

- [x] A1 Migración `barbershop_products` + bucket `barbershop-products` (corrida por Bautista el 08/10)
- [x] A2 Feature `catalogo_productos` en `src/lib/plans.ts`
- [x] A3 `src/lib/productos.ts` + `scripts/test-productos.ts` (sumarlo a `test:unit`)
- [x] A4 `/api/admin/products` (GET, POST con foto, PATCH, DELETE)
- [x] A5 Pantalla `/[slug]/admin/productos` + subpestaña en "Mi barbería"
- [x] A6 tsc + lint + test:unit + build
- [x] A7 Preview en rama → OK de Bautista logueado → merge

## Etapa B — La página pública

- [x] B1 `listAvailableProducts` en el servidor
- [x] B2 `BarbershopProductsSection` en la página de la barbería
- [x] B3 QA headless (con y sin productos, plan Solo) → merge

## Etapa C — Sumarlo al turno

- [x] C1 Migración `appointment_products` (corrida por Bautista el 08/10)
- [x] C2 `GET /api/products`
- [x] C3 `/api/appointments/book` acepta y guarda productos
- [x] C4 `booking/ProductPicker.tsx` + resumen + pantalla de éxito
- [x] C5 Productos en `AppointmentRow`, `StaffAgenda`, `/r/[token]` y el WhatsApp
- [x] C6 Reserva real en la demo, con y sin productos, midiendo el tiempo
- [x] C7 Preview → OK de Bautista → merge

## Etapa D — Reportes

- [x] D1 "Productos vendidos" en `AdminReportes` (unidades y plata por producto)
- [x] D2 Preview → OK de Bautista → merge
- [x] D3 `PENDIENTES.md` + qué mirar a los 30 días (SC-005)

## Verificación hecha

- **Reglas** (`scripts/test-productos.ts`, 52 tests): precio escrito a mano, validación de un
  producto, topes del pedido, total y "productos vendidos".
- **Etapa C contra el servidor real** (demo, 08/10): reserva con un producto → quedó guardado
  en `appointment_products` con nombre y precio copiados, y el link del cliente lo muestra.
  Pedido de 6 unidades → 400. Producto de otra barbería → descartado. Reserva sin productos:
  0,36 s (no empeoró). Todo lo de prueba se borró.
- **Pantallas** (headless, catálogo y respuestas simulados): paso de la reserva, topes, total,
  aviso de producto agotado, WhatsApp, fila del turno en el panel, reportes con y sin ventas
  y filtrando por barbero.
- **Sin verificar**: la subida de la FOTO de un producto contra el storage real (nadie cargó
  uno todavía), y la agenda del empleado con productos (se probó el endpoint solo por tipos).
