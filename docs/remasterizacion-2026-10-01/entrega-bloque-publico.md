# Entrega conjunta: superficies restantes

## Alcance aplicado

Pasada de consistencia visual en marketing (home, producto, precios, guias), acceso, pagina publica de barberia, reserva, gestion de turno por token, espera, resenas y pagina offline. Se mantienen la estructura y los contenidos existentes; no se considera un rediseño estructural nuevo de cada pagina.

- Metadata visual de 12px en lugar de 9-11px.
- Espaciado entre letras normal, preservando tamanos de titulares por superficie.
- Controles tactiles ampliados a 44px.
- Eliminacion del hover lift en cards de estas superficies.
- Importes con acento dorado solido, sin cambiar tarifas.
- Acceso compartido mas compacto y sin card envolviendo el formulario.
- Reserva con menos separacion vertical entre pasos y resumen.
- Aviso de horarios no disponibles sin afirmar que todos estan en el pasado.
- Reveal visible por defecto: no oculta contenido si no se ejecuta el observador.
- Se conservan los mecanismos existentes de movimiento reducido.

## Compatibilidad y limites

Sin modificaciones de RLS, migraciones, backend, contratos de tokens, logica de disponibilidad, precios, pagos, emails o permisos. Los helpers mantienen su comportamiento.

Las zonas administrativas y owner de entregas anteriores permanecen en la misma rama. No se ha hecho commit, push, merge ni deploy.

## Pruebas

Script capture-public-remaster.mjs: rutas home, producto, precios, guias, login, registro, recuperacion, nueva contrasena y offline. Fixtures de pagina publica, reserva, turno, espera y resena con datos ficticios. Interceptacion de red bloquea mutaciones externas; solo se simula la RPC de lectura de disponibilidad.

Viewports 360, 390, 768, 1024 y 1440px; movimiento reducido. Capturas completas y de primera pantalla mobile, y completas desktop. La reserva de prueba permite elegir 18:00 sin guardar.

## Pendientes para revisar juntos

- Validacion humana de jerarquia, densidad y copy de cada superficie.
- Auditoria completa de contraste y zoom 200%; no se ha medido una puntuacion WCAG.
- Foco y teclado de todos los dialogs, incluidos los owner que conservan su implementacion anterior.
- Pruebas E2E de pagos sandbox, email, login real, tokens y conflictos concurrentes en entorno de testing separado.
- Medicion de CLS/LCP; no se afirma mejora de rendimiento sin medicion.
- Marketing conserva su composicion e imagenes existentes; evaluar si requiere una segunda pasada estructural.

Esta entrega acredita una pasada visual y responsive, no que todas las specs originales esten cerradas al 100%.
