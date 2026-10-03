# Equipo y accesos - entrega local

Fecha: 2026-10-02.

## Cambios

- Separacion visual entre administradores con acceso completo y empleados con permisos individuales.
- Invitacion compacta, contador de cuentas y distincion clara del dueno de la barberia.
- Formularios legibles en mobile, controles tactiles de 44 px y correos largos sin desbordamiento.
- Permisos plegables para reducir la longitud del listado.
- Estados de carga y errores visibles, con reintento en ambas listas.
- Eliminacion del main anidado; la estructura principal pertenece a AdminShell.

## Archivos

- src/components/admin/AdminTeamManager.tsx
- src/components/admin/StaffAccessSection.tsx
- src/app/[barbershopSlug]/admin/equipo/page.tsx
- scripts/capture-admin-shell.mjs
- scripts/fixtures/admin-shell/team.tsx

## Verificacion

- Playwright: escritorio/mobile, anchos 360/390/768/1024/1440, permisos plegables, lista vacia, errores, correos largos y usuario no dueno.
- Pruebas realizadas con sesion ficticia y respuestas interceptadas. No se enviaron invitaciones ni se cambiaron permisos reales.
- npm run build: correcto, TypeScript y 223 paginas.
- npm run test:unit: correcto.
- npm run lint -- --ignore-pattern '.gstack/**': sin errores; warning previo de toUsageRecords en scripts/test-crm-export.ts.
- Avisos previos de deprecacion de Sentry conservados.

## Alcance

No se modificaron API, autorizacion, limites por plan, SQL ni dependencias. Pro mantiene multi_admin y Esencial mantiene cuentas_empleados. Esta entrega sigue local, sin commit ni deploy.

Capturas: 06-equipo-desktop.png, 06-equipo-mobile.png y 06-permisos-mobile.png en la carpeta externa tijerapp-remaster.
