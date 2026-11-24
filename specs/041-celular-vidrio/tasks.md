# Tasks: 041 TijerApp en el celular con vidrio

## Tanda 1 — base + Inicio (MERGEADA, PR #5, aprobada por Bautista 24/11)

- [x] T101 `src/styles/vidrio.css`: material, fondo con luces, panel del celular, iPhone, barra, Más, respaldos.
- [x] T102 `src/lib/ios-standalone-gap.ts` + `scripts/test-ios-standalone-gap.ts` (incluye: ningún fondo fijo en src).
- [x] T103 `CelularBase` (iPhone instalado + equipos flojos) y script temprano en el `<head>`; `viewportFit: cover` + franja de la hora.
- [x] T104 `useLockDocumentScroll`.
- [x] T105 `bottom-nav-items.ts` + `scripts/test-bottom-nav.ts`; `AdminBottomNav` (pastilla, Más que crece, gesto, ＋).
- [x] T106 `AdminChrome` con `tj-panel`; barra de arriba y subpestañas de vidrio; sin hamburguesa en el celular.
- [x] T107 ＋ → "Turno nuevo" en el Turnero (evento o `?nuevo=1`).
- [x] T108 Inicio con encabezado dorado y tarjetas de vidrio en el celular.
- [x] T109 lint, test:unit, build; prueba a 390 px en Chrome y WebKit, iPhone instalado simulado, compu sin cambios.
- [x] T110 Bautista lo aprobó → merge.

## Tanda 2 — Turnero + Ventana + Interruptor

- [x] T201 `src/components/ui/Ventana.tsx` (portado de Dentidad): hoja de vidrio que se baja con el dedo en el celular; en la compu, el panel de siempre (`panelClassName`).
- [x] T202 `src/components/ui/Interruptor.tsx`: pastilla dorada que se desliza en el celular; en la compu, el selector de siempre.
- [x] T203 Ventanas del Turnero a `Ventana`: Agregar turno, Editar, Repetir, Avisar cambio, Bloquear horario, Cancelar, y la hoja del calendario en el celular (`AgendaSheet`).
- [x] T204 Turnero: encabezado dorado, calendario y tarjetas de turno de vidrio, Lista/Calendario con `Interruptor`.
- [x] T205 `scripts/qa-celular.mjs`: entra con un dueño descartable de `primebarber`, saca capturas (390 px o `--compu`) y lo borra.
- [x] T206 Prueba: Agregar turno se cierra bajándolo con el dedo; Calendario, Todos y Bloquear hora a 390 px; compu igual (1280 px).
- [ ] T207 Bautista mira la preview → merge.
- Pendiente para cuando llegue su sección: `ConfirmDialog` (la usan todas las secciones) y Turno/Sobreturno (en la compu tiene estilo propio).
