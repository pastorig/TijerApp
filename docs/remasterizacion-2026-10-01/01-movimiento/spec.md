# Animaciones y microinteracciones

Fecha: 2026-10-01.
Estado: propuesta para revision; interfaz todavia no modificada.

## Superficie actual
Alcance transversal.
Fuentes: src/app/globals.css, src/components/home/ui/Reveal.tsx, package.json.
Antes de implementar: leer componentes importados y registrar capturas de referencia.

## Trabajo del usuario
Entender cambios de contexto y resultado de acciones sin esperar una animacion.

## Diseno y comportamiento
1. CSS para hover/foco; Framer Motion existente para apertura/cierre y continuidad de elementos.
2. Duraciones: feedback 120-160ms, overlays 180-220ms, entradas de contenido 200-260ms; marketing hasta 400ms.
3. Transform/opacity; desmontar contenido saliente sin bloquear accion siguiente; una fuente de tokens de motion.
4. Reduced-motion muestra estado final; pausar al ocultar pestana; sin entrada animada de LCP ni repetir animacion al filtrar.

## Responsive y accesibilidad
Verificar 360, 390, 768, 1024 y 1440px sin desbordes. Mantener controles tactiles de 44px, inputs de 16px en movil, foco visible, labels y texto alternativo. No depender solo del color. Contemplar teclado virtual, safe-area, zoom 200% y nombres largos.

## Estados
Contemplar carga con espacio reservado, vacio real, filtro sin resultados, error recuperable conservando valores y guardado sin duplicar acciones. Success solo tras resultado real. Aplicar permisos y restricciones de plan cuando correspondan, sin confundir ausencia de acceso con ausencia de datos.

## Movimiento
Seguir [contrato de movimiento](../01-movimiento/spec.md): feedback breve y continuidad sin bloquear acciones. Reduced-motion debe mostrar estado final. No animar importes, repetir entradas al filtrar ni ocultar informacion necesaria.

## Compatibilidad
Preservar contratos del [documento general](../README.md). No cambiar consultas, RLS, calculos, endpoints, redirecciones o planes por motivos esteticos. No introducir tablas ni dependencias. Extraer presentacion solo cuando reduzca duplicacion real.

## Criterios de aceptacion
- Navegar, filtrar y reservar sigue funcionando con movimiento reducido y sin JavaScript en contenido publico estatico.
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

