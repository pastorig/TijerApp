# Specification: Modo liviano y menos lag

**Branch**: `045-celular-liviano`
**Created**: 2026-11-25
**Status**: En curso
**Input**: Bautista (25/11/2026): "que cuando un celular tenga pocos recursos, la app se dé cuenta y
disminuya cosas que lageen la app, además de bajar el lag de todo".

## Medido antes de tocar

Build de producción local, 390 px, CPU frenada 6 veces con `scripts/qa-rendimiento.mjs` (demo
`primebarber`, 364 turnos):

| | Antes | Después |
|---|---|---|
| Tocar "Todos" en el Turnero | 7,4 s | 0,85 s |
| Elementos en pantalla con "Todos" | 27.830 | 3.566 |
| Elementos con desenfoque (Turnero con "Todos") | 369 | 4 |
| Elementos con desenfoque (Clientes) | 96 | 4 |
| Abrir el ＋ estando en el Turnero | 1,4 s | 0,3 s |

El scroll medía 60 fps en todo. La CPU frenada no simula la placa de video del celular, que es lo
que paga el desenfoque, así que eso solo se puede medir en el equipo (ver el detector).

## Qué cambia

1. **Listas por tandas.** El Turnero dibuja 40 turnos y Clientes 50. Al llegar al final se suman
   solos (o con "Mostrar N más"). Cambiar de filtro, de barbero, de día o de búsqueda vuelve a la
   primera tanda.
2. **El desenfoque solo en lo que flota.** Barras, ventanas, la barra de abajo y la barra lateral
   desenfocan. Las tarjetas quietas ya no: tienen detrás el fondo liso de luces, donde no se nota, y
   cada una era una capa más para la placa. Se ve igual.
3. **Detector de equipo flojo** (`src/lib/rendimiento.ts` + `CelularBase`):
   - Al cargar: memoria, núcleos y ahorro de datos.
   - Mientras se usa: mide los cuadros durante el scroll, en tandas de 1,5 s. Hacen falta dos tandas
     seguidas peores para bajar de nivel, así un tirón suelto no aliviana un equipo bueno.
   - El nivel solo sube en la sesión y se guarda. La próxima vez arranca liviano antes de dibujar
     (script en el `<head>`). A los 7 días se vuelve a probar.
4. **Qué apaga cada nivel**:
   - **Liviano:** menos desenfoque. Las animaciones que se repiten sin fin (brillos, latidos, el
     resplandor del fondo) dan una vuelta y paran. Los spinners siguen.
   - **Muy liviano:** sin desenfoque en ningún lado; barras y ventanas de color sólido. Sin
     animaciones (también las de Framer Motion), y transiciones de 120 ms para que tocar algo dé
     respuesta.
5. **El ＋ desde otra sección:** el Turnero se precarga cuando el celular está libre.
6. **Arreglo de la 044:** el fondo de la compu usaba `background-attachment: fixed`. El test del iPhone
   lo prohíbe porque trae la franja vacía en el iPad instalado, y además repinta en cada scroll. Ahora
   es una capa fija aparte.

## Fuera de alcance (anotado)

- El ＋ desde Inicio, Clientes o Reportes sigue tardando ~1,1 s con la CPU frenada 6 veces. Abrir
  "Agregar turno" sin navegar al Turnero pide sacar la ventana del Turnero: es otra feature.
- El Turnero trae TODOS los turnos de la barbería al cargar. Con años de historia conviene pedir por
  rango.

## Requirements

- **FR-001**: Las listas largas del panel MUST dibujarse por tandas.
- **FR-002**: El desenfoque MUST quedar solo en capas que flotan sobre contenido.
- **FR-003**: La app MUST detectar un equipo flojo por lo que informa y por lo que mide, y alivianarse
  sola, sin pedirle nada al usuario.
- **FR-004**: Un equipo bueno MUST verse igual que antes (nivel 0).
- **FR-005**: El nivel MUST persistir y volver a probarse a los 7 días.
