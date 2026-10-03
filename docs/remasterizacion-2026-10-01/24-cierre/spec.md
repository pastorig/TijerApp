# Cierre de caja

Fecha: 2026-10-01.
Estado: propuesta para revision; interfaz todavia no modificada.

Actualizacion 2026-10-02: [entrega local](entrega-cierre.md). La inspeccion confirma que hoy es un resumen diario con exportaciones, no un cierre contable persistido. Estados abierto/cerrado, guardado e historial quedan fuera de este rediseño y requieren una fase funcional propia.

## Superficie actual
Rutas: `/[barbershopSlug]/admin/cierre`.
Fuentes: src/components/admin/AdminCierreCajaManager.tsx, src/app/[barbershopSlug]/admin/cierre/page.tsx.
Antes de implementar: leer componentes importados y registrar capturas de referencia.

## Trabajo del usuario
Conciliar y cerrar una jornada con claridad.

## Diseno y comportamiento
1. Fecha, total y desglose encabezando; acciones de cierre despues del detalle.
2. Estados abierto/cerrado diferenciados; historial si existe sigue accesible.
3. Confirmacion contextual con fecha/importe; pendiente de guardado visible.
4. Preservar reglas financieras y comisiones actuales; error no simula cierre.

## Responsive y accesibilidad
Verificar 360, 390, 768, 1024 y 1440px sin desbordes. Mantener controles tactiles de 44px, inputs de 16px en movil, foco visible, labels y texto alternativo. No depender solo del color. Contemplar teclado virtual, safe-area, zoom 200% y nombres largos.

## Estados
Contemplar carga con espacio reservado, vacio real, filtro sin resultados, error recuperable conservando valores y guardado sin duplicar acciones. Success solo tras resultado real. Aplicar permisos y restricciones de plan cuando correspondan, sin confundir ausencia de acceso con ausencia de datos.

## Movimiento
Seguir [contrato de movimiento](../01-movimiento/spec.md): feedback breve y continuidad sin bloquear acciones. Reduced-motion debe mostrar estado final. No animar importes, repetir entradas al filtrar ni ocultar informacion necesaria.

## Compatibilidad
Preservar contratos del [documento general](../README.md). No cambiar consultas, RLS, calculos, endpoints, redirecciones o planes por motivos esteticos. No introducir tablas ni dependencias. Extraer presentacion solo cuando reduzca duplicacion real.

## Criterios de aceptacion
- Cierre repetido, periodo vacio y fallo al guardar no alteran cifras ni duplican operaciones.
- Tarea primaria realizable en celular y escritorio.
- Error/reintento mantienen contexto y entradas.
- Teclado y movimiento reducido permiten completar el flujo.
- Pantallas vecinas y rutas directas conservan comportamiento.
- Lint y build pasan; pruebas funcionales pertinentes acompanian cualquier cambio de comportamiento.

## Ejecucion y evidencia
1. Capturar estado actual con datos demo anonimizados.
2. Modificar presentacion manteniendo handlers y contratos.
3. Probar tarea primaria y casos limite descritos.
4. Comparar capturas mobile/desktop, carga, vacio y error.
5. Registrar archivos, verificaciones y limites antes de continuar.

Evidencia actual: inventario del codigo; esta propuesta no acredita pruebas visuales ni implementacion.
