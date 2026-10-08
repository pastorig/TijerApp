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

- [ ] C1 Migración `appointment_products` (la corre Bautista)
- [ ] C2 `GET /api/products`
- [ ] C3 `/api/appointments/book` acepta y guarda productos
- [ ] C4 `booking/ProductPicker.tsx` + resumen + pantalla de éxito
- [ ] C5 Productos en `AppointmentRow`, `StaffAgenda`, `/r/[token]` y el WhatsApp
- [ ] C6 Reserva real en la demo, con y sin productos, midiendo el tiempo
- [ ] C7 Preview → OK de Bautista → merge

## Etapa D — Reportes

- [ ] D1 "Productos vendidos" en `AdminReportes` (unidades y plata por producto)
- [ ] D2 Preview → OK de Bautista → merge
- [ ] D3 `PENDIENTES.md` + qué mirar a los 30 días (SC-005)
