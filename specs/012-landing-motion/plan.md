# Implementation Plan: Landing con movimiento — "Escena viva"

**Branch**: `012-landing-motion`
**Spec**: [spec.md](./spec.md) · **Research**: [research.md](./research.md)
**Created**: 2026-07-29
**Status**: Draft

## Architecture Overview

La estrategia es **sumar movimiento sin sumar peso**. El hallazgo que define el plan
(ver [research.md](./research.md) R1) es que `framer-motion` está declarada en
`package.json` pero no se importa en ningún archivo: hoy no pesa nada, y estrenarla en la
home le agregaría 35–50 KB gzip de JS a la superficie de marketing. Como lo que
necesitamos es acotado y el repo ya resuelve este problema a mano (`Reveal` +
keyframes en `globals.css`), se implementa **con código propio: 3 hooks chicos y CSS**.

El corazón técnico es un único hook, `useScrollProgress`, que traduce "cuánto scrolleaste
dentro de esta sección" a un número 0→1 y lo escribe **directamente en el DOM como una CSS
custom property** (`--progress`), sin pasar por el estado de React. El CSS consume esa
variable con `transform`. Resultado: el scroll no dispara ni un re-render, y solo se animan
propiedades de compositor (`translate3d`, `scaleX`, `scaleY`, `opacity`) — nunca layout.
Ese mismo hook alimenta el parallax del hero y el trazado de la línea de "Cómo funciona".

El segundo principio es **progressive enhancement**: el HTML servido ya contiene el estado
final (los números 24 y 82%, las barras a su altura, la línea completa). Las animaciones
*sobrescriben* ese estado tras montar, y solo si corresponde. Si no hay JS, si el visitante
tiene movimiento reducido, o si algo falla, se ve la versión final y correcta — nunca una
pantalla a medio dibujar.

## Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Librería de animación | **Ninguna** — hooks propios + CSS | framer-motion hoy no se usa: estrenarla costaría 35–50 KB gzip en la landing. Constitución §5. |
| Progreso de scroll | Hook que escribe `--progress` en el DOM | Cero re-renders por frame; el CSS hace el trabajo |
| Throttling | `requestAnimationFrame` + listener `{ passive: true }` | Evita bloquear el scroll y colapsa múltiples eventos por frame |
| Activación por viewport | `IntersectionObserver` (patrón ya usado por `Reveal`) | No paga costo cuando la sección no está en pantalla |
| Propiedades animadas | Solo `transform` y `opacity` | Compositor puro; cero layout shift (FR-009) |
| Barras del gráfico | `scaleY` + `transform-origin: bottom` | Animar `height` causaría layout en cada frame |
| Contadores | Escritura de `textContent` por `ref` | El valor final queda en el HTML servido (SSR + sin JS) |
| Movimiento reducido | Hook `matchMedia` + regla global ya existente | El CSS global cubre transiciones; JS necesita chequeo explícito |
| Tilt de desktop | `matchMedia("(hover: hover) and (pointer: fine)")` | Detecta mouse real, no ancho de pantalla |
| Frontera server/client | Solo `HeroShowcase` pasa a client | Stats y Cómo funciona siguen siendo server components |

## File-Level Changes

### New Files

- `src/components/home/ui/use-scroll-progress.ts` — hook que mide el progreso de scroll de
  un elemento (0→1) y lo escribe como `--progress`. Sin estado de React. Se desactiva solo
  fuera del viewport y bajo movimiento reducido (deja `--progress: 1`).
- `src/components/home/ui/use-prefers-reduced-motion.ts` — hook `matchMedia`, reactivo al
  cambio de preferencia. Lo consumen los tres componentes.
- `src/components/home/ui/use-count-up.ts` — anima el `textContent` de un elemento desde 0
  hasta su valor final, una sola vez, al entrar en viewport. No toca el árbol de React.
- `src/components/home/ui/HeroNotification.tsx` — client. La notificación cíclica "Nuevo
  turno · HH:MM": posicionada absoluta sobre el cluster, con ciclo por timeouts encadenados
  condicionado a viewport + visibilidad de pestaña.
- `src/components/home/ui/StepsProgressLine.tsx` — client. Envuelve la línea dorada de
  "Cómo funciona": aplica `--progress` para el trazado y expone qué pasos ya están
  "encendidos" (3 `setState` en total, uno por umbral cruzado).

### Modified Files

- `src/components/home/ui/HeroShowcase.tsx` — pasa a `"use client"`. Suma: parallax por
  capas (panel principal / panel flotante / halo a distinta velocidad), tilt sutil por
  puntero fino, barras animadas con `scaleY`, contadores en los dos KPIs, y monta
  `HeroNotification`. **No cambia ni un texto ni la estructura del markup.**
- `src/components/home/HomeHowItWorks.tsx` — sigue siendo server component. Reemplaza el
  `div` estático de la línea por `StepsProgressLine` y pasa a cada paso su estado de
  encendido. Copy y layout intactos.
- `src/components/home/HomeStats.tsx` — sigue siendo server component. Los `Reveal` suman la
  clase del pop de ícono. Cambio mínimo.
- `src/app/globals.css` — nuevas utilidades bajo la sección de marketing: `.scroll-line`
  (consume `--progress` con `scaleX`), `.parallax-layer` (consume `--progress` con
  `translate3d`), `.bar-grow` (`scaleY`), `.step-lit` (estado encendido del paso),
  `.icon-pop` (realce del ícono), y los keyframes de entrada/salida de la notificación.
  Todo dentro del sistema de tokens actual — **sin colores ni tokens nuevos**.

### Deleted Files

Ninguno.

## Data Model Changes

**No aplica.** La feature es puramente visual: no toca base de datos, ni migraciones, ni RLS.

## API Surface

**No aplica.** No hay endpoints nuevos ni modificados. No hay fetching de datos.

## UI / UX

### Component Hierarchy

```
app/page.tsx (server)
├── Hero <section> (server, sin cambios)
│   └── HeroShowcase ("use client")            ← MODIFICADO
│       ├── [parallax: panel principal / panel ingresos / halo]
│       ├── [barras con scaleY + contadores por ref]
│       └── HeroNotification (client)          ← NUEVO
├── HomeStats (server)                         ← MODIFICADO (mínimo)
│   └── Reveal (client, ya existía) + .icon-pop
└── HomeHowItWorks (server)                    ← MODIFICADO
    ├── StepsProgressLine ("use client")       ← NUEVO
    └── Reveal × 3 (client, ya existía)
```

### Key Interactions

- **Entrar al hero** → las 7 barras crecen desde cero en cascada; los KPIs cuentan de 0 a
  24 y 82%. Una sola vez.
- **Estar en el hero** → cada ~6 s entra la notificación de turno nuevo, permanece y sale.
  Se pausa si la sección sale de pantalla o la pestaña queda en segundo plano.
- **Mover el mouse sobre el hero (solo desktop)** → el cluster inclina levemente siguiendo
  el puntero, y vuelve a la posición neutra al salir.
- **Scrollear la home** → las capas del hero se desplazan a distinta velocidad (profundidad).
- **Scrollear "Cómo funciona"** → la línea dorada se traza de izquierda a derecha atada al
  scroll; al retroceder, se destraza. Cada paso se enciende cuando la línea lo alcanza.
- **Entrar a Stats** → las 4 tarjetas aparecen escalonadas, con un pop breve del ícono.

## Testing Strategy

- **Build verification**: `npx tsc --noEmit`, `npx eslint`, `npm run build` — los tres en
  verde, sin warnings nuevos.
- **Manual smoke tests** (dev local):
  1. Home en desktop: barras, contadores, notificación, tilt y parallax funcionando.
  2. Home en mobile (DevTools + celular real): scroll fluido, sin tilt, sin desbordes.
  3. Movimiento reducido activado: todo en estado final, sin nada moviéndose.
  4. "Cómo funciona": la línea acompaña el scroll en ambas direcciones y los pasos se
     encienden en orden.
  5. El resto de la home (ROI, testimonios, FAQ, etc.) sin cambios ni regresiones.
- **Edge cases a verificar** (del spec):
  - Scroll rápido de punta a punta → nada queda a medio animar.
  - Volver a subir → los reveals no se reinician (sin parpadeo).
  - Pestaña en segundo plano un rato → al volver, la notificación no dispara en ráfaga.
  - Ancho muy angosto → el panel flotante sigue oculto y no altera el layout.
  - Sin JS (deshabilitarlo en DevTools) → los números finales y todo el contenido visibles.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| El parallax genera jank en celulares de gama media | Solo `translate3d`, desplazamientos chicos (≤ 24px), listener pasivo con rAF y apagado fuera del viewport. Verificar en celular real, no solo DevTools. |
| `scaleY` deforma el `border-radius` de las barras | Radio de 2px y animación corta: imperceptible. Si molesta, contenedor con `overflow:hidden` (documentado en research R3). |
| Flash de contenido al hidratar el hero (ahora client) | El valor final va en el HTML; la animación solo lo sobrescribe después de montar. Nunca se renderiza "0". |
| La notificación tapa contenido o molesta en mobile | Posición absoluta sobre una zona vacía del cluster; se valida en pantalla chica durante el smoke test. |
| El JS extra del hero retrasa el LCP | Los hooks son ~120 líneas en total, sin dependencias. Comparar el First Load JS de `/` antes y después: no debe subir de forma significativa. |
| Alcance que se estira a otras secciones | El spec marca explícitamente las otras 8 secciones como fuera de alcance. |

## Rollback Plan

Feature puramente visual, sin migraciones ni cambios de datos: el rollback es trivial.

- Revertir el merge commit de `012-landing-motion` en `main` y redeployar.
- Sin migración que revertir. Sin feature flag (no se justifica: no hay riesgo de datos).
- Rollback parcial posible: cada pieza (hero / línea / stats) es independiente y se puede
  revertir sola.

## Constitution Check

| Principio | Estado | Nota |
|---|---|---|
| 1. Multi-tenant first | ✅ | La home es de plataforma; no toca nada por barbería |
| 2. Mobile-first | ✅ | Degradación explícita en mobile; sin tilt en táctil |
| 3. Estética premium minimal | ✅ | Sin tokens ni colores nuevos; movimiento sutil, sin ornamento |
| 4. Español rioplatense | ✅ | No se toca copy |
| 5. Stack discipline | ✅ | **Cero libs nuevas** — se evita estrenar framer-motion justamente por este principio |
| 6. No half-finished | ✅ | tsc + lint + build verdes obligatorios antes de cerrar |
| 7. Branch workflow | ✅ | Rama `012-landing-motion`, merge `--no-ff` |
| 8. Spec-driven | ✅ | spec → research → plan → tasks |

**Sin violaciones. Sin excepciones que documentar.**

## Next Steps

- Run **speckit-tasks** to decompose this plan into a dependency-ordered task list
