# Configuracion - entrega local

Fecha: 2026-10-02.

## Cambios

- Integracion con AdminShell: navegacion global, contexto de barberia y acceso consistente.
- Contenido sin main anidado, padding duplicado ni card envolvente.
- Secciones existentes conservadas: Identidad, Horarios, Reservas, Mensajes y Notificaciones.
- Controles tactiles de 44 px e inputs de 16 px en mobile.
- Navegacion con aria-pressed y nombre accesible; boton iconico de regreso con label.
- Errores y mensajes largos sin truncar; guardado correcto anunciado como status.
- Plantilla de WhatsApp con nombre accesible y variables faciles de tocar.
- Logo con selector de archivo identificado y sin card anidada.

## Archivos

- src/components/AdminSettingsForm.tsx
- src/app/[barbershopSlug]/admin/settings/page.tsx
- scripts/capture-admin-shell.mjs
- scripts/fixtures/admin-shell/settings.tsx
- Esta entrega e indice general.

## Verificacion

- Playwright: 360/390/768/1024/1440 sin desbordamiento, navegacion por secciones, entradas conservadas al cambiar de seccion, insercion de variable WhatsApp y validacion de apertura/cierre.
- Capturas 10-configuracion-mobile.png, 10-configuracion-desktop.png, 10-configuracion-horarios.png, 10-configuracion-reservas.png, 10-configuracion-mensajes.png y 10-configuracion-error.png.
- Datos demo aislados; no se guardo configuracion ni se subieron logos reales.
- Build correcto: TypeScript y 223 paginas. test:unit correcto.
- Lint con exclusion .gstack sin errores; warning previo toUsageRecords en scripts/test-crm-export.ts.

## Limites

Payload, validaciones, slug, guardado, uploads, plantilla, horarios por barbero y excepciones intactos. No se probo guardado real, push ni subida de archivos a produccion en esta entrega visual. Sin SQL ni dependencias; cambios locales sin commit/deploy.
