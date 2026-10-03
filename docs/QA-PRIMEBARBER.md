# Pruebas privadas de Primebarber

## Preparacion
1. Completar QA_EMAIL y QA_PASSWORD en C:/Users/Pastori/Desktop/tijerapp-qa.env, fuera de OneDrive y del repositorio.
2. Utilizar una cuenta temporal con acceso solo a Primebarber, no al panel owner.
3. Mantener QA_BASE_URL=http://localhost:3001 para probar el codigo local. Si se cambia, usar un dominio autorizado del proyecto.
4. Avisar que el archivo esta listo. No enviar credenciales por chat.

El archivo se movio fuera del repositorio. No se carga desde la aplicacion ni contiene variables NEXT_PUBLIC. La regla .env* de Git tambien protege archivos de entorno locales dentro del proyecto.

## Prueba de acceso
scripts/qa-login.mjs lee el archivo local e inicia una sesion aislada. Solo permite autenticacion y consultas de lectura; bloquea otras peticiones de escritura. No guarda cookies, estado de sesion, capturas de credenciales ni trazas.

Esta prueba verifica la redireccion al admin de Primebarber, no todas las funciones ni los permisos de otras barberias. Los escenarios de reserva, confirmacion, cancelacion y reprogramacion requieren una prueba posterior con escrituras explicitamente delimitadas. No enviar mensajes a clientes ni ejecutar pagos reales.

## Al terminar
Revocar el acceso de la cuenta temporal y borrar C:/Users/Pastori/Desktop/tijerapp-qa.env. Si OneDrive ya sincronizo la copia anterior, eliminarla tambien de su papelera y considerar cambiar la clave temporal. Este archivo no es un gestor de secretos.
