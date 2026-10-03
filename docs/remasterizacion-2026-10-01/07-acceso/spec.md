# Login, registro y recuperacion

Fecha: 2026-10-01.
Estado: propuesta para revision; interfaz todavia no modificada.

## Superficie actual
Rutas: `/login`, `/registro`, `/recuperar`, `/nueva-password`, `/owner/login`, `/[barbershopSlug]/admin/login`.
Fuentes: src/app/login/page.tsx, src/app/registro/page.tsx, src/app/recuperar/page.tsx, src/app/nueva-password/page.tsx.
Antes de implementar: leer componentes importados y registrar capturas de referencia.

## Trabajo del usuario
Entrar o recuperar acceso con errores comprensibles.

## Diseno y comportamiento
1. Compartir estructura de formulario y marca TijerApp; mantener contexto de barberia cuando corresponde.
2. Labels visibles, autocomplete, ver contrasena accesible y errores junto al campo.
3. Mantener seleccion de barberia, next, owner, empleado y redirecciones actuales.
4. Loading ocupa el mismo espacio del boton; error conserva campos; soporte para teclado y gestor de contrasenas.

## Responsive y accesibilidad
Verificar 360, 390, 768, 1024 y 1440px sin desbordes. Mantener controles tactiles de 44px, inputs de 16px en movil, foco visible, labels y texto alternativo. No depender solo del color. Contemplar teclado virtual, safe-area, zoom 200% y nombres largos.

## Estados
Contemplar carga con espacio reservado, vacio real, filtro sin resultados, error recuperable conservando valores y guardado sin duplicar acciones. Success solo tras resultado real. Aplicar permisos y restricciones de plan cuando correspondan, sin confundir ausencia de acceso con ausencia de datos.

## Movimiento
Seguir [contrato de movimiento](../01-movimiento/spec.md): feedback breve y continuidad sin bloquear acciones. Reduced-motion debe mostrar estado final. No animar importes, repetir entradas al filtrar ni ocultar informacion necesaria.

## Compatibilidad
Preservar contratos del [documento general](../README.md). No cambiar consultas, RLS, calculos, endpoints, redirecciones o planes por motivos esteticos. No introducir tablas ni dependencias. Extraer presentacion solo cuando reduzca duplicacion real.

## Criterios de aceptacion
- Login valido/invalido, usuario sin acceso, varias barberias y link de recuperacion expirado conservan comportamiento.
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

