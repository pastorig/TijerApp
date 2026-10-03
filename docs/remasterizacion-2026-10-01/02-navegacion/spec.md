# Navegacion y shells

Fecha: 2026-10-01.
Estado: propuesta para revision; interfaz todavia no modificada.

## Superficie actual
Alcance transversal.
Fuentes: src/components/admin/AdminChrome.tsx, src/components/admin/AdminSidebar.tsx, src/components/admin/admin-nav.ts, src/components/staff/StaffShell.tsx, src/components/owner/OwnerShell.tsx.
Antes de implementar: leer componentes importados y registrar capturas de referencia.

## Trabajo del usuario
Saber donde estoy y llegar a mi tarea con pocos toques.

## Diseno y comportamiento
1. Conservar grupos Inicio/Agenda/Clientes/Equipo/Caja/Mi barberia y links reales; aplicar filtrado por plan existente.
2. Desktop: sidebar persistente y encabezado compacto; movil: header y drawer, seccion activa visible.
3. Drawer con foco inicial, Escape, fondo inerte, scroll contenido y foco restaurado al disparador.
4. Subtabs sin scroll anidado que robe gesto vertical; avisos de plan/instalacion fuera del camino de la tarea primaria.

## Responsive y accesibilidad
Verificar 360, 390, 768, 1024 y 1440px sin desbordes. Mantener controles tactiles de 44px, inputs de 16px en movil, foco visible, labels y texto alternativo. No depender solo del color. Contemplar teclado virtual, safe-area, zoom 200% y nombres largos.

## Estados
Contemplar carga con espacio reservado, vacio real, filtro sin resultados, error recuperable conservando valores y guardado sin duplicar acciones. Success solo tras resultado real. Aplicar permisos y restricciones de plan cuando correspondan, sin confundir ausencia de acceso con ausencia de datos.

## Movimiento
Seguir [contrato de movimiento](../01-movimiento/spec.md): feedback breve y continuidad sin bloquear acciones. Reduced-motion debe mostrar estado final. No animar importes, repetir entradas al filtrar ni ocultar informacion necesaria.

## Compatibilidad
Preservar contratos del [documento general](../README.md). No cambiar consultas, RLS, calculos, endpoints, redirecciones o planes por motivos esteticos. No introducir tablas ni dependencias. Extraer presentacion solo cuando reduzca duplicacion real.

## Criterios de aceptacion
- Cada ruta directa conserva grupo activo y permisos; cerrar drawer permite continuar en el punto anterior.
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

