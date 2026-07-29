# Research — 012 Landing con movimiento

**Fecha**: 2026-07-29
**Objetivo**: resolver las incógnitas técnicas del spec antes de diseñar la implementación.

---

## R1 — ¿framer-motion o implementación propia?

**Decisión: implementación propia (sin framer-motion).**

**Hallazgo que cambió el enfoque:** `framer-motion@^12.40.0` figura en `dependencies` pero
**no se importa en ningún archivo de `src/`**. Hoy el tree-shaking la elimina por completo:
no pesa nada en el bundle. Usarla en la home no sería "aprovechar algo que ya está" —
sería *estrenarla*, y el costo (estimado 35–50 KB gzip para `motion` + `useScroll` +
`useTransform` + `AnimatePresence`) caería justo sobre la landing de marketing, en mobile
y con conexiones argentinas.

La constitución del proyecto (§5) exige justificar toda lib pesada. Acá no hay
justificación suficiente: lo que necesitamos es poco y el repo **ya tiene el patrón
resuelto a mano** (`Reveal` con IntersectionObserver + keyframes en `globals.css`).

**Rationale:**
- Costo de bundle en la landing: **0 KB** contra 35–50 KB.
- Consistencia: se sigue el patrón que ya usan Stats y Cómo funciona.
- El alcance real es chico: un hook de progreso de scroll (~40 líneas) cubre parallax y
  trazado de línea; el resto son animaciones de entrada que el CSS ya sabe hacer.

**Alternativas consideradas:**
- *framer-motion*: la más cómoda de escribir y trae `useReducedMotion` listo. Descartada
  por costo de bundle en la superficie más sensible del producto.
- *CSS `animation-timeline: scroll()`*: sería ideal (cero JS), pero al día de hoy no tiene
  soporte estable en Safari ni Firefox. Descartada: media base de iPhone relevante.

> **Nota para el futuro:** si framer-motion sigue sin usarse en ningún lado, conviene
> sacarla de `package.json` en una limpieza aparte. Fuera del alcance de esta feature.

---

## R2 — ¿Cómo atar una animación al progreso de scroll sin generar jank?

**Decisión: hook `useScrollProgress` que escribe una CSS custom property, sin re-render de React.**

El hook mide con `getBoundingClientRect()` dentro de un listener de scroll *pasivo*,
throttleado por `requestAnimationFrame`, y escribe el progreso (0→1) directamente en el
elemento como `--progress`. El CSS consume esa variable con `transform`.

**Rationale:**
- **Cero re-renders**: no se llama a `setState` por frame. React no participa del scroll.
- Solo se tocan `transform`/`opacity` (propiedades compuestas), nunca layout.
- Se apaga solo: un `IntersectionObserver` desconecta el listener cuando la sección no está
  en pantalla, así el scroll del resto de la home no paga nada.

**Alternativas consideradas:**
- *`setState` por frame*: reconciliación de React 60 veces por segundo. Descartado.
- *Keyframes CSS con duración fija*: no cumple FR-005 (tiene que avanzar y retroceder con
  el scroll, no correr sola).

**Antecedente propio:** ya sabemos que el jank en este proyecto viene de animar cosas
caras, no de la frecuencia de los callbacks — animar solo `translate3d`/`scale` es la regla.

---

## R3 — El gráfico de barras: por qué NO animar `height`

**Decisión: animar `transform: scaleY()` con `transform-origin: bottom`.**

Hoy las barras se dibujan con `height: <n>%`. Animar `height` dispara layout + paint en
cada frame, para 7 barras, en el hero (lo primero que se ve). Con `scaleY` la barra
mantiene su altura final en el layout desde el primer momento (el markup ya tiene el valor
final) y solo se escala visualmente — trabajo puro de compositor, y **cero layout shift**
(FR-009).

**Detalle:** las barras tienen `border-radius` arriba; `scaleY` deforma el radio mientras
dura la animación. Con barras de ~2px de radio y ~500 ms de animación es imperceptible; si
molestara, se corrige envolviendo la barra en un contenedor con `overflow:hidden`.

---

## R4 — La línea de "Cómo funciona"

**Decisión: `transform: scaleX(var(--progress))` con `transform-origin: left`.**

La línea ya existe como un `div` de 1px con un gradiente dorado. Escalarla en X desde la
izquierda produce exactamente el efecto de "trazado" pidiendo solo compositor. El
`--progress` sale del mismo hook de R2, medido sobre la sección.

Los tres pasos se encienden comparando el progreso contra umbrales (≈0.15 / 0.5 / 0.85).
Para esto sí hace falta estado en React (cambian clases), pero es **un `setState` por
umbral cruzado** (3 en total), no por frame.

---

## R5 — Los contadores del hero y el SSR

**Decisión: el valor final va en el HTML; la animación lo sobrescribe por `ref` después de montar.**

Si el contador arrancara con `useState(0)`, el HTML servido diría "0" y el número correcto
aparecería recién al hidratar: mala primera impresión, y rompe el requisito de que el
contenido esté en el marcado.

En cambio: el componente **renderiza `24` y `82%` siempre**. Al montar (y solo si el
elemento entró en pantalla y no hay movimiento reducido), un `requestAnimationFrame`
escribe `textContent` desde 0 hasta el valor final. Sin JS, o con movimiento reducido, el
usuario ve el número final. Es la versión "progressive enhancement" del contador.

---

## R6 — La notificación cíclica

**Decisión: ciclo por `setTimeout` encadenado, condicionado a visibilidad.**

El ciclo (entra → espera → sale → pausa ≈6 s) solo corre si:
1. el hero está en pantalla (`IntersectionObserver`), y
2. la pestaña está activa (`document.visibilityState` + evento `visibilitychange`).

**Rationale (FR-102):** un `setInterval` suelto sigue corriendo con la pestaña oculta y, en
algunos navegadores, dispara varias veces seguidas al volver. Con timeouts encadenados y
limpieza en el `cleanup` del efecto, eso no puede pasar.

La notificación se posiciona **absoluta** sobre el cluster, así entrar y salir no mueve
nada del layout (FR-004/FR-009). El horario varía entre repeticiones recorriendo una lista
fija de horarios plausibles (FR-103) — nada de `Math.random()` en el primer render, para no
romper la hidratación.

---

## R7 — Dónde cortar server/client

**Decisión: `HeroShowcase` pasa a `"use client"`; `HomeStats` y `HomeHowItWorks` siguen siendo server components.**

`HeroShowcase` necesita hooks (parallax, contadores, notificación), así que lleva
`"use client"`. **Esto no pierde SSR**: en App Router los client components igual se
renderizan en el servidor para el HTML inicial; lo único que agregan es hidratación.

Stats y Cómo funciona se mantienen server: la parte interactiva se aísla en componentes
client chiquitos (el wrapper de la línea con su progreso, y el `Reveal` que ya es client).
Así el JS que se suma queda acotado.

---

## R8 — `prefers-reduced-motion`

**Decisión: hook propio `usePrefersReducedMotion` (matchMedia) para lo que maneja JS; el CSS global ya cubre transiciones y keyframes.**

`globals.css` ya neutraliza `animation-duration` y `transition-duration` bajo
`prefers-reduced-motion: reduce`. Eso alcanza para reveals y pops (que son CSS), pero **no**
para lo que gobierna JS: contadores, parallax y el ciclo de la notificación.

El hook lee `matchMedia("(prefers-reduced-motion: reduce)")` y escucha cambios. Con
movimiento reducido: no se registran listeners de scroll, no arranca el contador, no corre
el ciclo de la notificación, y el `--progress` queda fijo en 1 (línea trazada, estado
final). Cumple FR-008 y SC-003.

---

## R9 — Detección de puntero fino (tilt de desktop)

**Decisión: `matchMedia("(hover: hover) and (pointer: fine)")`.**

Es la consulta correcta para "tiene mouse de verdad", mejor que medir ancho de pantalla
(una notebook chica tiene mouse; una tablet grande no). Si no matchea, el listener de
`mousemove` no se registra y el cluster queda en su posición neutra — sin estados
intermedios (FR-010).

---

## Resumen de decisiones

| # | Tema | Decisión |
|---|---|---|
| R1 | Librería | Implementación propia, **sin framer-motion** (0 KB al bundle) |
| R2 | Scroll-linked | Hook que escribe `--progress`, rAF + listener pasivo, sin re-render |
| R3 | Barras | `scaleY` (no `height`) |
| R4 | Línea | `scaleX` + umbrales para encender pasos |
| R5 | Contadores | Valor final en el HTML, animado por `ref` tras montar |
| R6 | Notificación | Timeouts encadenados, gated por viewport + visibilidad |
| R7 | Server/client | Solo `HeroShowcase` pasa a client; el resto queda server |
| R8 | Movimiento reducido | Hook `matchMedia` + el CSS global existente |
| R9 | Tilt | `(hover: hover) and (pointer: fine)` |

**Ninguna incógnita queda abierta.** Listo para el plan.
