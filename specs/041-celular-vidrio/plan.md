# Implementation Plan: TijerApp en el celular con vidrio ("Noche dorada")

**Branch**: `041-celular-vidrio` · **Spec**: spec.md · **Guía**: `docs/design-system-vidrio.md`
**Created**: 2026-11-24 · **Status**: tanda 1 en curso

## Architecture Overview

Todo el cambio vive **por debajo de 768 px**. Un solo archivo de estilos, `src/styles/vidrio.css`,
fuera de `@layer` (le gana a Tailwind) y fuera de `globals.css` (la caché de Turbopack en Vercel ya
sirvió un `globals.css` viejo en Dentidad). Las clases `tj-m-*` solo pintan en el celular, así una
pantalla las suma sin tocar cómo se ve en la compu.

El panel del celular deja de scrollear el documento: `.tj-panel` mide la pantalla y el scroll va por
adentro (`.tj-panel-scroll`), con la barra de abajo `absolute` en el fondo del panel. Es la estructura
que en Dentidad resolvió la app instalada en el iPhone (6 PRs): `IosStandaloneGap` + el script del
`<head>` prenden `html[data-ios-gap]` y con eso el panel pasa a `100vh`, dentro de la página.

El vidrio sale de la receta de Solvian (reflejo + base negra semitransparente que deja leer sin
desenfoque) con las luces doradas de la maqueta B. El desenfoque usa `--tj-vf`, más liviano en
pantallas táctiles y todavía más en equipos flojos (clase en `<html>` que pone `RendimientoVidrio`).

## Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Estilos | `src/styles/vidrio.css` sin `@layer`, variables `--tj-*` | Una sola fuente; sin hex sueltos en componentes |
| Alcance por tamaño | Reglas dentro de `@media (max-width: 767.98px)` y clases `tj-m-*` | FR-010: la compu no cambia |
| Navegación | `AdminBottomNav` (cápsula + ＋ + Más que crece) | Mecánica de Dentidad `bottom-nav.tsx`, reescrita más chica |
| ＋ | Evento `tj:turno-nuevo` si ya está en Turnero; si no, `/turnero?nuevo=1` | El modal de turno nuevo vive en `AdminAppointments` |
| iPhone instalado | Port de `ios-standalone-gap` + script temprano + `useLockDocumentScroll` + `viewportFit: cover` | Probado en producción en Dentidad |
| Rendimiento | `--tj-vf` 10 px táctil / 7 / 4 px en equipos flojos; nada anima `filter` | Solvian: de 3–13 % a 1–2 % de cuadros lentos |
| Dependencias | Ninguna | Constitución §5 |

## Constitution exception (§3 "sin glows ni gradientes")

Las luces doradas difuminadas del fondo, el reflejo del vidrio y el halo del ＋ son el pedido explícito
de Bautista (dirección B elegida el 24/11/2026). Se limitan al dorado de marca y a blancos/negros
translúcidos; ningún color nuevo.

## Tandas y archivos

### Tanda 1 — base + Inicio (esta PR)

Nuevos:
- `src/styles/vidrio.css` — material, fondo, panel, iPhone, barra, Más, respaldos.
- `src/lib/ios-standalone-gap.ts` + `scripts/test-ios-standalone-gap.ts`.
- `src/components/pwa/CelularBase.tsx` — `IosStandaloneGap` + `RendimientoVidrio`.
- `src/hooks/useLockDocumentScroll.ts`.
- `src/components/admin/AdminBottomNav.tsx` + `src/components/admin/bottom-nav-items.ts` (+ test).

Modificados:
- `src/app/layout.tsx` — `viewportFit: "cover"`, script temprano, franja de la hora, `CelularBase`.
- `AdminChrome.tsx` — `.tj-panel` / `.tj-panel-scroll`, la barra, sin hamburguesa en el celular.
- `AdminTopBar.tsx`, `AdminSubtabs.tsx` — barra de vidrio y la hora del iPhone.
- `AdminAppointments.tsx` — abre "Turno nuevo" desde el ＋.
- `AdminDashboard.tsx` — encabezado con luz dorada y tarjetas de vidrio en el celular.

### Tanda 2 — Turnero + `Ventana` + `Interruptor`
Port de `ventana.tsx` e `interruptor.tsx` de Dentidad; las ventanas del turno pasan a `Ventana`.

### Tandas 3 a 7
Clientes; Caja/Equipo/Mi barbería; agenda del empleado (misma barra con sus permisos); reserva del
cliente; landing y login. Cada una suma su caso al e2e del celular.

## Testing Strategy

- `npx eslint src scripts`, `npm run test:unit`, `npm run build`.
- Capturas a 390 px (Chrome y WebKit) de cada pantalla tocada, con la barra y el Más abiertos;
  `elementFromPoint` en cada botón para confirmar que nada lo tapa.
- Simulación de la app instalada (`data-ios-gap` a mano + UA de iPhone): el panel llega al borde, la
  barra es `absolute`, ningún `background-attachment: fixed`.
- Captura a 1280 px antes/después: igual.
- **Preview de Vercel que Bautista mira logueado en su iPhone antes del merge** (regla del panel).

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Franja vacía abajo en el iPhone instalado | Port completo del arreglo de Dentidad + prueba de Bautista en el iPhone antes de mergear |
| Scroll trabado por el blur | `--tj-vf` liviano en táctil, un vidrio por bloque, nunca por fila |
| `viewportFit: cover` mete contenido bajo la hora en páginas públicas | Franja fija negra + `padding-top: env(safe-area-inset-top)` en el body fuera del panel |
| Una pantalla con `sticky`/`fixed` propio deja de funcionar dentro del scroll interno | Revisar las pantallas de cada tanda a 390 px; `sticky` sigue andando dentro del área de scroll |

## Rollback Plan

Revertir el merge de la tanda. Sin migraciones ni datos.
