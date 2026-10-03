# Recordatorios - entrega local

Fecha: 2026-10-02.

## Alcance inspeccionado

Esta ruta lista recordatorios manuales por WhatsApp. La suscripcion push se configura en otra superficie y no se modifica en esta entrega.

## Cambios

- Encabezado compacto, tipografia legible y nombres largos sin truncar.
- Filas mobile con horario/fecha, cliente/servicio/barbero y accion agrupados; desktop horizontal.
- Controles de 44 px y marca local sin reducir contraste de toda la fila.
- La etiqueta pasa de Enviado a WhatsApp abierto: el flujo abre WhatsApp y marca localStorage, no verifica envio o entrega.
- Error con reintento; una falla no muestra grupos vacios como resultado valido.
- Carga anunciada con status y espacio reservado.

## Archivos

- src/components/admin/AdminRemindersManager.tsx
- scripts/capture-admin-shell.mjs
- scripts/fixtures/admin-shell/reminders.tsx
- Esta entrega e indice.

## Verificacion

- Playwright con datos simulados: 360/390/768/1024/1440, tres grupos, marca local y desmarcado, nombres largos, vacio, error/reintento.
- No se abrio WhatsApp ni se enviaron mensajes reales durante QA.
- Build y test:unit correctos.
- Capturas 12-recordatorios-mobile.png, 12-recordatorios-desktop.png, 12-recordatorios-empty.png, 12-recordatorios-long.png y 12-recordatorios-error.png.

## Limites

Links, criterio temporal, orden, exclusion de cancelled/deleted y almacenamiento local intactos. No se modificaron cron, push, permisos, SQL ni dependencias. La marca permanece local y no representa un comprobante de entrega. Sin commit/deploy.
