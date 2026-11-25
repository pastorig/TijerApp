# Plan: Reportes de períodos anteriores (043)

**Spec**: [spec.md](./spec.md) · **Rama**: `043-reportes-periodos-anteriores`

## Enfoque

Sin migraciones ni consultas nuevas: `AdminReportes` ya trae todos los turnos de la barbería y filtra
por rango en el navegador. Alcanza con que el rango sepa ir para atrás.

1. **`src/lib/report-ranges.ts`**
   - Funciones nuevas: `rangoMirado(periodo, hoy, atras)`, `rangoDeComparacion(periodo, hoy, atras)`,
     `nombreDelPeriodo(periodo, hoy, atras)` y la constante `MAX_ATRAS`.
   - Con `atras = 0` delegan en `rangoDelPeriodo` y `rangoAnterior`, que no cambian: el período en
     curso da exactamente lo mismo que antes (SC-003).
   - Con `atras > 0` usan el período completo (`rangoCompleto`).
2. **`AdminReportes.tsx`**
   - Estado `atras` y fila ‹ nombre › debajo de Día · Semana · Mes.
   - Cambiar de tipo de período vuelve `atras` a 0.
   - La leyenda dice contra qué se compara cuando el período ya terminó.
   - El PDF y la liquidación por WhatsApp usan el nombre del período.
3. **`pdf-export.ts`**: el nombre del archivo se limpia, porque ahora el período trae fechas con "/".
4. **Celular**: los botones son `button` con borde, así que los pinta la capa de material de la 041
   (vidrio, esquina de 14 px). No hace falta CSS nuevo.

## Pruebas

- `scripts/test-reportes-rangos.ts`: suma 25 casos sobre el 25/11/2026:
  - octubre entero contra septiembre entero; febrero con 28 días; cruce de año;
  - semana pasada de lunes a domingo; ayer contra anteayer;
  - los nombres de los períodos;
  - los topes: no se va al futuro y no pasa de 24 meses.
- `qa-celular.mjs` con `pasos-043`, a 390 px y en la compu:
  - ‹ lleva a "Octubre 2026";
  - › vuelve y queda deshabilitada;
  - cambiar a Día y tocar ‹ lleva a "Ayer";
  - nada tapado y ningún error.
