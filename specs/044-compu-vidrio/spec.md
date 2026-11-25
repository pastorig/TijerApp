# Specification: La compu con vidrio "Noche dorada"

**Branch**: `044-compu-vidrio` (una rama por tanda: `044-tanda-N`)
**Created**: 2026-11-25
**Status**: En curso
**Input**: Bautista (25/11/2026), al ver Reportes en la compu: "aplicalo en pc también, mejoremos la vista
en pc también". Elegido en el chat: **todo el panel en la compu**.

## Antes

La 041 llevó el vidrio solo al celular (< 768 px). En la compu y la tablet el panel sigue con el estilo
plano de antes: fondo negro liso, barra lateral negra, subpestañas de línea, tarjetas grises. Las mismas
pantallas se ven como dos productos distintos según dónde se abran.

## Qué cambia

El mismo lenguaje de la 041 en la compu y la tablet, sin cambiar dónde está cada cosa:

- **Fondo** con las luces doradas, quieto detrás del contenido mientras se scrollea.
- **Barra lateral de vidrio**: la sección elegida es una píldora dorada, como en la barra de abajo
  del celular.
- **Barra de arriba y subpestañas** de vidrio; las subpestañas son píldoras con la elegida en dorado.
- **Encabezado de cada sección**: tarjeta con la luz dorada arriba a la derecha.
- **Material en todo el contenido**: tarjetas de vidrio, botones redondeados, dorado con reflejo,
  campos oscuros, estados vacíos suaves. Es la misma capa de la 041, que ahora no depende del ancho.
- Las páginas públicas que ya tenían el vidrio en el celular (reserva, link del turno, inicio de
  TijerApp, login) lo tienen también en la compu, porque usan la misma capa.

## Requirements

- **FR-001**: En ≥ 768 px el panel del dueño, la agenda del empleado y Configuración MUST usar el fondo
  con luces y el material de la 041.
- **FR-002**: La barra lateral (≥ 1024 px) MUST ser de vidrio, con la sección actual en píldora dorada.
- **FR-003**: Las subpestañas MUST ser píldoras, con la elegida en dorado, en todos los anchos.
- **FR-004**: El encabezado de cada sección MUST verse como tarjeta en la compu (no sangra hasta el borde).
- **FR-005**: El celular MUST quedar igual que con la 041.
- **FR-006**: Nada puede quedar tapado ni desbordar a 1280 px ni a 390 px.
- **FR-007**: Ventanas (`Ventana`) en la compu: panel de vidrio centrado con entrada suave (tanda 2).

## Tandas

1. **Base** (esta): fondo, barra lateral, barra de arriba, subpestañas, encabezados y la capa de material
   en la compu. Arreglos que salieron: el calendario del Turnero sin aire en la compu, y Clientes sin
   encabezado.
2. **Ventanas y empleado**: `Ventana` de vidrio centrada en la compu (Agregar turno, Editar, Cancelar,
   etc.) y las pestañas de la agenda del empleado en píldoras.
3. **Pulido**: lo que aparezca al usarlo (tablas, calendario semanal, Reportes con la barra de controles
   de la 043).

## Fuera de alcance

- Cambiar dónde está cada cosa o agregar funciones.
- Modo claro.
- `/owner` (panel de la plataforma).
