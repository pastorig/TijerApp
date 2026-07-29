# Tasks: Landing con movimiento — "Escena viva"

**Branch**: `012-landing-motion`
**Spec**: [spec.md](./spec.md) · **Research**: [research.md](./research.md) · **Plan**: [plan.md](./plan.md)
**Created**: 2026-07-29

## Overview

Feature puramente visual sobre tres secciones de la home (`/`): Hero, Stats y "Cómo
funciona". Sin base de datos, sin endpoints, sin dependencias nuevas. La infraestructura
compartida son tres hooks propios + utilidades CSS; después cada sección se implementa y
se verifica por separado.

**Tests**: no se generan tests automáticos. El repo tiene un harness liviano
(`npm run test:unit`) pensado para lógica de negocio pura, no para animación de DOM. La
verificación de esta feature es `tsc` + `eslint` + `build` + smoke test manual (así lo
define el plan, sección Testing Strategy).

**Historias de usuario** (derivadas de los Acceptance Scenarios del spec):

| Historia | Prioridad | Escenarios | Alcance |
|---|---|---|---|
| US1 — Hero vivo | P1 (MVP) | 1, 2 | Parallax de capas, barras que crecen, contadores, notificación cíclica, tilt |
| US2 — Cómo funciona encadenado | P2 | 3 | Línea trazada por scroll + pasos que se encienden |
| US3 — Stats escalonado | P3 | 4 | Entrada escalonada + pop de ícono |

Los escenarios 5 (movimiento reducido) y 6 (fluidez en mobile) son transversales: se
resuelven en la fase Foundational y se verifican en Polish.

---

## Phase 1: Setup

- [x] T001 Confirmar que la rama activa es `012-landing-motion` y que el árbol está limpio (`git status`) en `C:/Users/Pastori/OneDrive/Desktop/Proyect/TijerApp`
- [x] T002 Tomar la línea base de verificación antes de tocar nada: correr `npx tsc --noEmit`, `npm run lint` y `npm run build`, y anotar el "First Load JS" de la ruta `/` que reporta el build (se compara al final, riesgo de LCP del plan)
- [x] T003 Crear el directorio de hooks compartidos `src/components/home/ui/` ya existe — verificar que no haya colisión de nombres con `use-scroll-progress.ts`, `use-prefers-reduced-motion.ts` y `use-count-up.ts`

---

## Phase 2: Foundational (bloquea todas las historias)

**Propósito**: los tres hooks y las utilidades CSS que consumen las tres secciones. Nada de
esto es visible por sí solo; sin esto, ninguna historia se puede implementar.

- [x] T004 [P] Crear `src/components/home/ui/use-prefers-reduced-motion.ts`: hook que lee `matchMedia("(prefers-reduced-motion: reduce)")`, escucha `change` y limpia el listener al desmontar. Debe devolver `false` en el primer render del servidor y sincronizar en el efecto para no romper hidratación (research R8)
- [x] T005 Crear `src/components/home/ui/use-scroll-progress.ts`: hook que recibe un `ref` a un elemento y escribe el progreso de scroll (0→1) como la custom property `--progress` sobre ese elemento. Requisitos: medición con `getBoundingClientRect()`, listener de `scroll` con `{ passive: true }` throttleado por `requestAnimationFrame`, `IntersectionObserver` que conecta/desconecta el listener según visibilidad, y cortocircuito bajo movimiento reducido dejando `--progress: 1` fijo. Sin `setState` por frame (research R2, FR-005, FR-008)
- [x] T006 [P] Crear `src/components/home/ui/use-count-up.ts`: hook que anima el `textContent` de un elemento por `ref` desde 0 hasta su valor final, una sola vez, disparado por `IntersectionObserver`, con `requestAnimationFrame` y easing corto. Acepta un formateador (para el `%`). No corre bajo movimiento reducido ni re-renderiza React; el valor final ya está en el marcado (research R5, FR-003)
- [x] T007 Agregar a `src/app/globals.css`, dentro de la sección de utilidades de marketing, las clases nuevas: `.parallax-layer` (`translate3d` en función de `--progress`, con `--parallax-depth` por capa), `.scroll-line` (`scaleX(var(--progress))` con `transform-origin: left`), `.bar-grow` (`scaleY` con `transform-origin: bottom` y cascada por `--bar-index`), `.step-lit` (estado encendido del paso), `.icon-pop` (realce breve del ícono) y los keyframes de entrada/salida de la notificación. Solo `transform`/`opacity`; sin colores ni tokens nuevos (FR-009, principio 3 de la constitución)
- [x] T008 Verificar que el bloque `prefers-reduced-motion: reduce` ya existente en `src/app/globals.css` neutraliza también las clases nuevas de T007 (que ninguna quede animándose ni en un estado intermedio, p. ej. `--progress` sin definir debe leerse como 1) (FR-008, SC-003)

**Checkpoint**: `npx tsc --noEmit` y `npm run lint` en verde. La home se ve exactamente igual que antes (nada consume los hooks todavía).

---

## Phase 3: User Story 1 — Hero vivo (P1, MVP)

**Objetivo**: el cluster del hero cobra vida solo — profundidad al scrollear, el gráfico se
dibuja, los KPIs cuentan y entra una notificación de turno nuevo cada tanto.

**Test independiente**: abrir `/` en desktop y en mobile. Al cargar, las 7 barras crecen en
cascada y los KPIs cuentan hasta 24 y 82%. Al scrollear, las capas del cluster se desplazan
a distinta velocidad. Cada ~6 s entra y sale la notificación. Con el mouse sobre el cluster
(solo desktop) inclina levemente. Ninguna de estas cosas mueve el resto de la página.

- [x] T009 [P] [US1] Crear `src/components/home/ui/HeroNotification.tsx` (`"use client"`): notificación "Nuevo turno · HH:MM" posicionada absoluta sobre una zona vacía del cluster. Ciclo por `setTimeout` encadenados (entra → permanece → sale → pausa ≈6 s), gateado por `IntersectionObserver` y por `document.visibilityState` + evento `visibilitychange`, con limpieza completa en el cleanup del efecto. El horario rota sobre una lista fija de horarios plausibles — nada de `Math.random()` en el primer render (research R6, FR-004, FR-102, FR-103)
- [x] T010 [US1] Convertir `src/components/home/ui/HeroShowcase.tsx` a `"use client"` y agregar el parallax de capas: `useScrollProgress` sobre el contenedor raíz, y `.parallax-layer` con distinta `--parallax-depth` en el halo, el panel principal y el panel flotante de ingresos. Desplazamientos ≤ 24px. Sin tocar ni un texto ni la estructura del markup (FR-001, FR-009)
- [x] T011 [US1] En `src/components/home/ui/HeroShowcase.tsx`, cambiar las 7 barras del panel de ingresos para que la altura final siga en el `style` (estado final en el HTML) y la animación de entrada use `.bar-grow` con `scaleY` en cascada por índice, disparada al entrar el hero en viewport, una sola vez. No animar `height` (research R3, FR-002)
- [x] T012 [US1] En `src/components/home/ui/HeroShowcase.tsx`, aplicar `useCountUp` a los dos KPIs ("Turnos hoy" → 24, "Ocupación" → 82%). El marcado sigue renderizando `24` y `82%`; el hook los sobrescribe por `ref` tras montar. Verificar en el HTML servido (`view-source`) que los valores finales están presentes (FR-003, research R5)
- [x] T013 [US1] En `src/components/home/ui/HeroShowcase.tsx`, agregar el tilt por puntero: listener de `mousemove` registrado **solo** si `matchMedia("(hover: hover) and (pointer: fine)")` matchea y no hay movimiento reducido; inclinación sutil del cluster que vuelve a neutro en `mouseleave`. En táctil no se registra nada y el cluster queda en posición neutra (FR-010, research R9)
- [x] T014 [US1] Montar `HeroNotification` dentro de `HeroShowcase` en una posición que no tape el CTA ni el contenido del panel, y confirmar que su entrada/salida no produce layout shift (FR-004, FR-009)
- [ ] T015 [US1] Smoke test de US1: `/` en desktop (barras, contadores, notificación, tilt, parallax), en mobile (sin tilt, panel flotante sigue oculto en pantallas angostas, sin desbordes) y con movimiento reducido activado (todo en estado final, quieto)

**Checkpoint**: US1 completa y verificable sola. El hero ya "vende" sin las otras dos secciones.

---

## Phase 4: User Story 2 — "Cómo funciona" encadenado (P2)

**Objetivo**: la línea dorada se traza siguiendo el scroll y cada paso se enciende cuando la
línea lo alcanza.

**Test independiente**: scrollear lentamente sobre la sección "Cómo funciona" en desktop: la
línea avanza de izquierda a derecha atada al scroll y retrocede al subir; los pasos 01, 02 y
03 se encienden en orden a medida que la línea los alcanza.

- [x] T016 [US2] Crear `src/components/home/ui/StepsProgressLine.tsx` (`"use client"`): reemplaza el `div` estático de la línea. Usa `useScrollProgress` sobre la sección y aplica `.scroll-line` con `scaleX(var(--progress))`. Expone por render prop (o children-as-function) qué pasos están encendidos comparando el progreso contra umbrales ≈0.15 / 0.5 / 0.85 — un `setState` por umbral cruzado, no por frame (research R4, FR-005, FR-006)
- [x] T017 [US2] Modificar `src/components/home/HomeHowItWorks.tsx` para usar `StepsProgressLine` en lugar del `div` de la línea y pasar a cada paso su estado "encendido" (clase `.step-lit` en el círculo del ícono). El componente sigue siendo server component; el copy, el orden y el layout quedan intactos. Mantener el gradiente dorado y el posicionamiento actual de la línea (FR-006, FR-009, SC-004)
- [x] T018 [US2] Verificar la degradación de US2: con movimiento reducido, la línea aparece trazada al 100% y los tres pasos encendidos desde el inicio; sin JS, el marcado muestra la sección completa y legible (FR-008, SC-003)
- [ ] T019 [US2] Smoke test de US2: scroll hacia abajo y hacia arriba sobre la sección — la línea acompaña en ambas direcciones sin saltos, los pasos se encienden en orden y no hay parpadeo al volver a subir

**Checkpoint**: US1 + US2 funcionando juntas, sin interferirse.

---

## Phase 5: User Story 3 — Stats escalonado (P3)

**Objetivo**: las cuatro tarjetas de beneficios entran escalonadas con un pop breve del ícono.

**Test independiente**: scrollear hasta la tira de beneficios: las 4 tarjetas aparecen una
después de otra y sus íconos hacen un realce breve al aparecer.

- [x] T020 [US3] Modificar `src/components/home/HomeStats.tsx` para sumar la clase `.icon-pop` al contenedor del ícono de cada beneficio, conservando el escalonado que ya da `Reveal` con `delay={(index % 4) * 70}`. Sigue siendo server component; sin cambios de copy ni de estructura (FR-007, SC-004)
- [ ] T021 [US3] Verificar que el pop del ícono no pisa el `group-hover:scale-105` existente ni deja el ícono en un estado intermedio al terminar, y que bajo movimiento reducido el ícono aparece directamente en su estado final (FR-008)

**Checkpoint**: las tres historias implementadas.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T022 Verificar los edge cases del spec de punta a punta en `/`: scroll muy rápido (nada queda a medio animar), volver a subir (los reveals no se reinician), pestaña en segundo plano un rato (la notificación no dispara en ráfaga al volver), pantalla muy angosta (el panel flotante sigue oculto), JS deshabilitado en DevTools (todo el contenido y los números finales visibles)
- [ ] T023 Verificar que las otras ocho secciones de la home (ROI, Qué es, Testimonios, Personas, Comparación, Product Gate, FAQ, Contacto) no tienen ninguna regresión visual ni de comportamiento (alcance del spec, Won't Have)
- [x] T024 Correr `npx tsc --noEmit`, `npm run lint` y `npm run build` — los tres en verde, sin warnings nuevos (SC-005, constitución §6)
- [x] T025 Comparar el "First Load JS" de la ruta `/` contra la línea base de T002: no debe subir de forma significativa. Si subió, revisar qué quedó del lado cliente (riesgo de LCP del plan)
- [ ] T026 Probar en celular real (no solo DevTools): scroll de la home completa fluido, sin tirones perceptibles ni saltos de contenido (SC-002; el jank de rasterizado no se ve en DevTools)
- [x] T027 Marcar los ítems del checklist `specs/012-landing-motion/checklists/requirements.md` que quedaron cubiertos y anotar cualquier desvío
- [x] T028 Commit de la implementación en `012-landing-motion` con mensaje `feat(012): landing con movimiento — escena viva`

---

## Dependencies

```
Phase 1 (Setup: T001–T003)
        ↓
Phase 2 (Foundational: T004–T008)   ← BLOQUEA todo lo demás
        ↓
   ┌────┴──────────────┬───────────────────┐
   ↓                   ↓                   ↓
Phase 3 (US1)     Phase 4 (US2)      Phase 5 (US3)
T009–T015         T016–T019          T020–T021
   └────┬──────────────┴───────────────────┘
        ↓
Phase 6 (Polish: T022–T028)
```

**Dependencias internas**:

- T005 (`useScrollProgress`) bloquea T010 y T016.
- T006 (`useCountUp`) bloquea T012.
- T004 (`usePrefersReducedMotion`) bloquea T005, T006, T009, T013.
- T007 (utilidades CSS) bloquea T010, T011, T016, T017, T020.
- T009 (`HeroNotification`) bloquea T014.
- T010 bloquea T011, T012, T013, T014 (todos tocan el mismo archivo, `HeroShowcase.tsx`).
- T016 bloquea T017.

**Independencia entre historias**: US1, US2 y US3 tocan archivos distintos y se pueden
implementar y revertir por separado (rollback parcial previsto en el plan).

## Parallel Execution

**Dentro de Foundational**: T004 y T006 son independientes entre sí (archivos distintos, T006
solo necesita el hook de T004 en tiempo de import, no de implementación) → `[P]`. T005 y T007
conviene hacerlos en orden porque el contrato de `--progress` se define entre los dos.

**Entre historias**: una vez cerrada la Phase 2, US1 / US2 / US3 se pueden atacar en paralelo
— no comparten ningún archivo:

- US1 → `HeroShowcase.tsx`, `HeroNotification.tsx`
- US2 → `HomeHowItWorks.tsx`, `StepsProgressLine.tsx`
- US3 → `HomeStats.tsx`

**Dentro de US1**: solo T009 es `[P]`; T010–T014 tocan todos `HeroShowcase.tsx` y van en serie.

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + Phase 3 (US1)**. El hero es lo que ve el 100% de las visitas y lo
único que se percibe sin scrollear: si hubiera que cortar, se corta después de T015 y la
feature ya tiene valor.

Incremento sugerido:

1. **T001–T008** — infraestructura invisible. Checkpoint: la home no cambió.
2. **T009–T015 (US1)** — el hero cobra vida. Checkpoint: entregable por sí solo.
3. **T016–T019 (US2)** — el scroll cuenta los tres pasos.
4. **T020–T021 (US3)** — el detalle de Stats.
5. **T022–T028** — edge cases, verificaciones y cierre.

**Conteo**: 28 tareas — 3 setup, 5 foundational, 7 en US1, 4 en US2, 2 en US3, 7 de polish.

## Estado de verificación (2026-07-29)

**Verificado automáticamente (verde):**

- `npx tsc --noEmit`, `npm run lint`, `npm run build` — sin errores ni warnings nuevos.
- **Cableado de variables**: forzando `--progress` sobre la lista de pasos, la línea da
  `scaleX` 0 / 0.6 / 1 y los tres íconos se encienden en el orden esperado
  (opacidad `[0,0,0]` → `[1,1,0]` → `[1,1,1]`).
- **Fallback sin JS**: quitando `--progress`, la línea queda trazada al 100% y los tres
  pasos encendidos — el estado final, como pide FR-008/SC-003.
- **SSR / progressive enhancement**: el HTML servido ya trae `24`, `82%`, `$284.500`, el
  copy completo de los tres pasos y las clases de animación. Nada de contenido se genera
  por animación (FR-003, research R5).
- **Bundle**: +48 KB sin comprimir sobre el total de chunks de cliente (≈13–15 KB gzip),
  por el hero pasando a client component. Sigue por debajo de los 35–50 KB **gzip** que
  hubiera costado estrenar framer-motion, así que la decisión R1 se sostiene.

**NO verificable en este entorno** (T015, T019, T021, T022, T023, T026):

El navegador headless de la sesión no compone frames. Se comprobó que ahí:
`IntersectionObserver` nunca entrega callbacks (los `Reveal` **ya existentes** tampoco se
activan: 0 de 17), los eventos de `scroll` no se emiten aunque `scrollY` cambie, y
`getComputedStyle().transform` devuelve identidad incluso con un `transform` inline
directo. Es la limitación conocida de QA headless en Windows, no un problema del código.

**Queda para verificación manual de Bautista** (en navegador real + celular real):

1. Hero: barras en cascada, contadores, notificación cada ~6 s, tilt con mouse, parallax.
2. "Cómo funciona": la línea acompaña el scroll en ambos sentidos y los pasos se encienden
   en orden.
3. Stats: entrada escalonada + pop del ícono, y que el pop no pise el hover.
4. Movimiento reducido activado: todo en estado final, quieto.
5. Edge cases: scroll rápido, volver a subir, pestaña en segundo plano, pantalla angosta.
6. Las otras ocho secciones de la home sin regresiones.

## Next Steps

- Verificación manual de los 6 puntos de arriba antes de mergear a `main`.
