# Plan: Catálogo de productos en la reserva

**Spec**: [spec.md](./spec.md) · **Fecha**: 2026-10-08 · **Migraciones**: dos (las corre Bautista).

Se entrega en tres etapas. Cada una se puede subir sola y deja algo usable; ninguna rompe
la reserva de hoy si la siguiente se demora.

## Etapa A — El dueño carga su catálogo (nada público todavía)

1. **Migración `barbershop_products`**: `id`, `barbershop_slug` (FK, cascade), `name`,
   `price` (entero, > 0), `category` (check con la lista fija), `description`,
   `storage_path`, `public_url`, `is_available` (default true), `sort_order`,
   `deleted_at`, `created_at`. Índice por `(barbershop_slug, sort_order)`. RLS activado y
   **sin políticas** + `revoke` a `anon` y `authenticated`: solo la toca el servidor, como
   las tablas nuevas desde la 033. En la misma migración, el bucket público
   `barbershop-products` (5 MB, png/jpg/webp), igual que el de la galería.
2. **`src/lib/plans.ts`**: feature `catalogo_productos: ["esencial", "pro"]`.
3. **`src/lib/productos.ts`** (puro, con tests): categorías, validación de un producto,
   normalización de un pedido (`[{id, cantidad}]` → topes de 5 por producto y 10
   renglones, sin duplicados) y cálculo del total.
4. **`/api/admin/products`** (GET, POST, PATCH, DELETE) con el helper compartido
   `resolveBarbershopAdminAccess`. Escribir pasa por `assertPlanFeature`; leer por
   `assertTierIncludesFeature` (en modo lectura el dueño sigue viendo su catálogo). Cada
   update y delete filtra por `barbershop_slug`, y el path de la foto se lee de la base,
   nunca del navegador (los dos errores que ya se arreglaron en cupones y galería).
5. **Pantalla `/[slug]/admin/productos`**, subpestaña de "Mi barbería": lista con foto,
   precio e interruptor de disponible; alta y edición en una hoja; reordenar con flechas.
   En plan Solo, la explicación y el plan que lo trae.

## Etapa B — La página pública

6. **`listAvailableProducts(slug)`** en el servidor (service role), llamada desde
   `[barbershopSlug]/page.tsx` igual que las reseñas: la sección sale en el HTML (se
   indexa) y no hay salto de contenido al cargar.
7. **`BarbershopProductsSection`** entre Servicios y Galería, con `Escalera`/`Peldano`
   de `public/LandingMotion.tsx`. No se dibuja si no hay productos o el plan no lo trae.

## Etapa C — Sumarlo al turno

8. **Migración `appointment_products`**: `id`, `appointment_id` (FK, cascade),
   `barbershop_slug`, `product_id` (FK, `set null` al borrar), `product_name`,
   `unit_price`, `quantity` (1 a 5), `created_at`. RLS sin políticas + `revoke`.
9. **`GET /api/products?bs=`** público y de solo lectura para el formulario de reserva
   (los disponibles, con lo mínimo: id, nombre, precio, categoría, foto).
10. **`/api/appointments/book`**: acepta `products`. La lectura del catálogo entra en la
    primera tanda de consultas en paralelo (no suma un viaje). Después del insert del
    turno, inserta los renglones. Si ese insert falla, o algún producto ya no está, el
    turno queda igual y la respuesta lo dice (`productosNoSumados`). Una reserva sin
    productos no hace ninguna consulta de más.
11. **`BookingForm`**: paso opcional "¿Te llevás algo?" (`booking/ProductPicker.tsx`) entre
    el horario y los datos; el resumen suma los productos; la pantalla de éxito los lista
    y avisa de los que no entraron.
12. **Mostrar en el turno**: `AppointmentRow` (turnero y hoja del calendario),
    `StaffAgenda`, `/r/[token]` y el link de WhatsApp de la reserva. Los productos viajan
    con el turno en las mismas consultas que ya lo traen (un `select` anidado), no en una
    consulta aparte por turno.

## Decisiones

- **Copia del nombre y el precio en el renglón del turno.** Es lo que hace que editar o
  borrar un producto no reescriba la historia. Mismo criterio que `service_name` y
  `service_price` en `appointments`.
- **Los productos no entran en la transacción del turno.** El turno se crea primero. Un
  fallo al guardar productos se informa, no se revierte: perder un turno por una cera es
  peor que un turno sin su cera anotada. Cuando exista la "reserva atómica" (pendiente
  aparte), los productos pueden mudarse adentro.
- **Sin políticas de RLS para el público.** El formulario lee por un endpoint del
  servidor. Coherente con haber cerrado `appointments` al público en agosto.
- **Los productos no tocan `service_price`, ingresos, caja ni comisiones** en esta
  versión (pregunta abierta 1 de la spec). El "total a cobrar" del turno se calcula al
  mostrarlo.
- **El paso de la reserva es una tira horizontal, no una lista.** En el celular una lista
  de diez productos empuja "Tus datos" dos pantallas para abajo, y el botón de reservar
  con ellos.

## Riesgos

- **Fricción en la reserva.** Es el flujo que más importa del producto. Mitigación: el
  paso no aparece si no hay productos, no bloquea nada y SC-002 se mide (mismos toques
  que hoy).
- **Velocidad de la reserva.** Se acaba de bajar de 2,5–4,3 s a 0,5 s. Mitigación: la
  consulta del catálogo va en paralelo y solo cuando el pedido trae productos.
- **Pantalla nueva del panel.** Regla vigente: preview en una rama y OK de Bautista
  logueado antes de mergear.
- **Migración sin correr = feature muerta sin síntomas** (ya pasó dos veces). Mitigación:
  si la tabla no existe, la pantalla del panel lo dice y la reserva sigue como hoy.
- **Que nadie lo use.** SC-005: se mira a los 30 días antes de sumar reportes o stock.

## Verificación

- Tests de `productos.ts` (validación, topes, total).
- Etapa A: alta, edición, foto, agotado y borrado en preview, por Bautista logueado.
- Etapa C: reserva con y sin productos en la demo, con la respuesta del servidor medida;
  producto agotado a mitad de la reserva; producto de otra barbería en el pedido.
- QA headless a 390 px y 1366 px: sin desborde, botón de reservar siempre visible.
