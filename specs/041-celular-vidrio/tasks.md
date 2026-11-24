# Tasks: 041 TijerApp en el celular con vidrio

## Tanda 1 — base + Inicio

- [x] T101 `src/styles/vidrio.css`: material, fondo con luces, panel del celular, iPhone, barra, Más, respaldos.
- [x] T102 `src/lib/ios-standalone-gap.ts` + `scripts/test-ios-standalone-gap.ts` (incluye: ningún fondo fijo en src).
- [x] T103 `CelularBase` (iPhone instalado + equipos flojos) y script temprano en el `<head>`; `viewportFit: cover` + franja de la hora.
- [x] T104 `useLockDocumentScroll`.
- [x] T105 `bottom-nav-items.ts` + `scripts/test-bottom-nav.ts`; `AdminBottomNav` (pastilla, Más que crece, gesto, ＋).
- [x] T106 `AdminChrome` con `tj-panel`; barra de arriba y subpestañas de vidrio; sin hamburguesa en el celular.
- [x] T107 ＋ → "Turno nuevo" en el Turnero (evento o `?nuevo=1`).
- [x] T108 Inicio con encabezado dorado y tarjetas de vidrio en el celular.
- [x] T109 lint, test:unit, build; prueba a 390 px en Chrome y WebKit (nada tapado salvo el ícono de Next en dev), iPhone instalado simulado, compu sin cambios.
- [ ] T110 Bautista mira la preview logueado en su iPhone (y con la app instalada) → merge.

## Tanda 2 — Turnero + Ventana + Interruptor
- [ ] T201 Port de `Ventana` (Dentidad) con estilo Noche dorada.
- [ ] T202 Port de `Interruptor`.
- [ ] T203 Ventanas del turno (nuevo, editar, mover, cancelar, duplicar, bloquear) → `Ventana`.
- [ ] T204 Lista y calendario del Turnero en vidrio.
