# Guía de diseño · TijerApp en el celular ("Noche dorada")

Fuente de verdad del rediseño del celular (specs/041-celular-vidrio). Todo vive en
`src/styles/vidrio.css`. **Solo por debajo de 768 px**: la compu no cambia.

## Material

| Pieza | Receta | Clase |
|---|---|---|
| Vidrio de bloque (tarjeta, panel, lista) | `linear-gradient(180deg, #fff/.10, #fff/.03)` sobre `rgb(12 10 6/.45)`, `--tj-vf`, luz `inset 0 1px 0 #fff/.18`, contorno `inset 0 0 0 1px #fff/.12`, sombra negra | `tj-m-vidrio` |
| Barra de abajo / de arriba | igual, base `rgb(12 10 6/.72)` (casi opaca: el texto que pasa debajo no se ve como mancha) | `tj-nav`, `tj-m-barra` |
| Botón principal | reflejo blanco arriba + degradé dorado `#e2c266 → #c9a23e → #8a6e25`, texto negro | `tj-boton-oro` |
| Botón secundario | reflejo `#fff/.12 → .02`, luz y contorno blancos, **sin** desenfoque | `tj-boton-vidrio` |
| Encabezado de sección | luz dorada `radial-gradient(80% 100% at 100% 0%, oro/.38)` sobre `#1c160b → #0a0806`, borde de abajo redondeado 30 px | `tj-m-hero` |
| Fondo | tres luces doradas difuminadas + negro; en el panel, nunca `fixed` | `tj-panel` |

**Reglas:**
- Un vidrio por bloque, nunca uno por fila (las filas separan con línea `#fff/.07`).
- Botones e interruptores **no** llevan `backdrop-filter`: el vidrio sale del reflejo y la sombra.
- La pieza elegida va casi opaca (dorado lleno): translúcida se ve lavada.
- Los campos de formulario no van en vidrio.
- Siempre `-webkit-backdrop-filter` junto con `backdrop-filter`.
- Nunca animar `filter` ni `backdrop-filter`: solo `transform`, `opacity` (y el alto del Más).

## Radios

Barra 26 · pastilla de la barra 20 · tarjetas 22 · hoja de ventana 30 arriba · botones e
interruptores 999.

## Movimiento

| Uso | Curva | Duración |
|---|---|---|
| Abrir (sube con rebote chico) | `cubic-bezier(0.3, 1.18, 0.5, 1)` | 420–460 ms |
| Cerrar (hoja de iOS, sin rebote) | `cubic-bezier(0.32, 0.72, 0, 1)` | 340 ms |
| Salida/entrada simple | `cubic-bezier(0.23, 1, 0.32, 1)` | ≤ 300 ms |
| Apretar | `scale: .97` | 160 ms |

Con "reducir movimiento": solo opacidad, 160 ms.

## Respaldos

- Sin `backdrop-filter`, o con "reducir transparencia": vidrio → `rgb(14 12 8 / .96)`.
- Táctil: `--tj-vf: blur(10px) saturate(150%)`; equipo flojo `html.tj-lento` 7 px; `html.tj-muy-lento` 4 px.

## iPhone instalado

- El panel del celular no scrollea el documento: `.tj-panel` (alto de pantalla) + `.tj-panel-scroll`.
- `html[data-ios-gap]` (lo pone el script del `<head>` y `IosStandaloneGap`): el panel pasa a `100vh`
  dentro de la página y la barra a `absolute` con `padding-bottom: max(28px, safe-area)`.
- Nada `fixed` pegado abajo en el panel; nada con `background-attachment: fixed`.
- Lo de arriba respeta `env(safe-area-inset-top)`; la franja de la hora es negra lisa
  (`.tj-franja-estado`).
