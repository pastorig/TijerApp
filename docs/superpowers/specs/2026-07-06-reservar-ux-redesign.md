# Rediseño UX de /reservar (enfoque A: pulido en el lugar)

**Fecha**: 2026-07-06 · **Branch**: `006-reservar-ux-redesign`
**Aprobado por**: Bautista (enfoque A + más gráficos + copy intuitivo)

## Objetivo

Mejorar la experiencia de la página pública de reserva (`/[slug]/reservar`,
componente `BookingForm.tsx`) manteniendo la estructura de una sola pantalla y
la marca lockeada (negro `#0a0a0a` + gold `#c9a23e` + silver, Geist, minimal).
No es un rebrand ni un wizard: es pulido visual + UX + conversión + mobile.

## Principios / restricciones

- Respetar tokens de `globals.css` y primitives de `src/components/ui/`.
- Íconos: `lucide-react` (ya es dependencia). Sin libs nuevas.
- Mobile-first, touch targets `min-h-11` (44px).
- No romper la lógica existente: barbero/servicio/fecha/hora, cupón, lista de
  espera, seña MercadoPago, `formatDateWithWeekday`, disponibilidad real, submit.
- Sin cuenta (reserva pública sin login).

## Cambios (las 4 lentes)

### 1. Barbero → tarjetas seleccionables (visual)
Reemplazar el `<Select>` (cuando hay >1 barbero) por tarjetas con avatar
(iniciales en círculo gold), nombre y rol. Con 1 barbero, display lindo sin
elegir. Nuevo componente `booking/BarberPicker.tsx`.

### 2. Servicio → tarjetas con precio + duración + ícono (visual)
Reemplazar el `<Select>` por tarjetas: ícono (tijera), nombre, duración
("30 min") y precio grande. Nuevo componente `booking/ServicePicker.tsx`.

### 3. Fecha → tira de días táctil (UX/mobile)
Reemplazar el `<input type="date">` por una tira horizontal scrolleable de los
próximos ~14 días como pills ("JUE 18"). Fallback: link "otra fecha" que abre
el date input nativo para fechas más lejanas. Nuevo `booking/DateStrip.tsx`.

### 4. Horario → misma grilla, pulida (visual)
Mantener split mañana/tarde. Sumar ícono de reloj al encabezado, mejorar el
estado activo/hover de las pills, y los no disponibles más claros (tachado;
"muy pronto" cuando aplica la anticipación mínima — reason `too-soon`).

### 5. Revelado progresivo (UX)
Los datos de contacto (nombre, teléfono, email, comentario, cupón) se muestran
recién cuando hay `selectedTime`. Antes de eso, un hint suave ("Elegí un horario
para seguir"). Menos formulario de golpe.

### 6. Pasos numerados + microcopy intuitivo (copy)
Cada bloque con número y copy claro: **1. Elegí tu barbero**, **2. ¿Qué te
hacés?**, **3. ¿Qué día?**, **4. ¿A qué hora?**, **5. Tus datos**. Frases de
confianza: "Cancelás gratis hasta 1h antes", "Sin cuenta, sin vueltas".
Componente helper `booking/StepHeader.tsx` (número + título + subtítulo).

### 7. CTA fija abajo en mobile (conversión)
Barra sticky al fondo en mobile (`lg:hidden`) con el precio del servicio + botón
"Reservar turno", visible mientras se scrollea. En desktop, el CTA queda en el
resumen lateral como hoy. El form ya tiene `pb-32` para dejarle lugar.

### 8. Detalle premium (visual)
Íconos lucide por sección, spacing/rhythm más prolijo, transiciones suaves, el
resumen lateral como un "ticket" más lindo (precio destacado + detalle).

## Componentes nuevos (todos presentacionales, en `src/components/booking/`)

- `BarberPicker.tsx` — recibe `barbers`, `selectedId`, `onSelect`.
- `ServicePicker.tsx` — recibe `services`, `selectedId`, `onSelect`.
- `DateStrip.tsx` — recibe `value`, `onChange`, `minDate`, días a mostrar.
- `StepHeader.tsx` — `number`, `title`, `subtitle?`.
- `MobileBookingBar.tsx` — barra sticky mobile (precio + CTA).
- `InitialsAvatar` (chico, inline o en ui) — círculo con iniciales.

`BookingForm.tsx` orquesta el estado (como hoy) y usa estos componentes.

## Fuera de scope (por ahora)

- Fotos reales de barberos (usamos iniciales; si hay logo/foto, después).
- Reseñas/rating inline (posible mejora de conversión futura).
- Wizard multi-paso (descartado: elegimos enfoque A).

## Verificación

- `npm run lint` + `npm run build` verdes.
- Smoke visual (screenshots) en mobile y desktop de `/primebarber/reservar`.
- No romper: reserva end-to-end, cupón, lista de espera, seña, anticipación
  mínima, barbería con 1 vs varios barberos.
