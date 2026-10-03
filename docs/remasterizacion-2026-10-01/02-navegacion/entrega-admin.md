# Entrega 01: navegacion del admin

Fecha: 2026-10-01. Rama: design/admin-shell-remaster.
Estado: implementado localmente, sin commit, push ni deploy.

## Alcance

- Sidebar oscuro neutro, logo vigente, seleccion dorada y jerarquia de grupos.
- Contexto de barberia, plan y acceso a pagina publica en el pie del menu.
- Barra superior compacta con grupo y pagina activa.
- Subpestanas con estado actual accesible y superficie consistente.
- Controles de al menos 44px y enlace para saltar al contenido.
- Drawer movil nativo: fondo inerte, foco contenido, Escape, cierre exterior,
  scroll bloqueado, restauracion del foco y cierre al pasar a escritorio.
- Entrada de 220ms con movimiento reducido respetado.

No cambia queries, permisos, auth, planes, reservas, dinero ni reglas de agenda.
Dashboard, empleado y owner conservan sus interfaces; esta entrega no completa
la spec transversal de todos los shells.

## Archivos

AdminChrome.tsx, AdminSidebar.tsx, AdminTopBar.tsx, AdminSubtabs.tsx y
AdminShell.module.css en src/components/admin.
Prueba: scripts/capture-admin-shell.mjs y scripts/fixtures/admin-shell.

## Evidencia

Capturas en la carpeta local tijerapp-remaster del espacio de visualizaciones:
01-menu-mobile.png, 01-mobile.png, 01-desktop.png y 01-pestanas-desktop.png.
Usan datos ficticios; el contenido del dashboard mostrado aun no esta
remasterizado. No acreditan pruebas autenticadas en produccion.

La prueba visual crea rutas locales temporales protegidas por development,
intercepta Supabase con fixtures y aborta escrituras/remotos. Retira las rutas
al terminar. No requiere claves ni usuarios reales.

Para repetir, iniciar el servidor local en el puerto 3001 y ejecutar:

```powershell
$env:PLAYWRIGHT_MODULE='C:\Users\Pastori\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
$env:CAPTURE_DIR='C:\Users\Pastori\.codex\visualizations\2026\05\25\019e5ca0-6447-7770-9c50-01c1f136cfb5\tijerapp-remaster'
node scripts/capture-admin-shell.mjs
```

Edge headless instalado; sin dependencias agregadas al proyecto. En otro equipo
usar PLAYWRIGHT_MODULE y BROWSER_CHANNEL propios. Ejecutar desde la raiz del repo.

## Verificacion

- Prueba previa fallo por ausencia de dialog accesible.
- Prueba final correcta: ciclo de foco, Escape, backdrop, foco restaurado,
  scroll desbloqueado y aria-current.
- Anchos 360/390/768/1024/1440 sin overflow horizontal.
- Movimiento reducido revisado y capturas finales inspeccionadas.
- Build y TypeScript correctos; sin rutas design-preview en el build.
- Suite test:unit completa correcta, con advertencias previas de Node.
- Lint sin errores usando exclusion .gstack/** por EPERM previo; warning
  existente en test-crm-export.ts. Avisos previos Sentry sin cambios.

## Siguiente zona

Inicio del admin: jerarquia del proximo turno, metricas legibles y acciones
rapidas compactas, manteniendo los calculos actuales. Capturas por entrega.
