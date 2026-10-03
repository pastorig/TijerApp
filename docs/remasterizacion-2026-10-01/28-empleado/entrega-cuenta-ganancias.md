# Empleado: ganancias y cuenta

Fecha: 2026-10-02. Zona 18. Cambios locales sin commit ni deploy.

## Ganancias
- Periodo visible y navegacion con flechas accesibles de 44px.
- Comision destacada, produccion y turnos en grid 2x2 de columnas mobile.
- Tarjetas planas sin gradientes ni elevacion.
- Sin comision configurada sigue mostrando mensaje, no un falso importe cero.
- Error con reintento conserva mes y no presenta datos anteriores como actuales.
- Importes y porcentajes siguen llegando del mismo endpoint, sin recalculos UI.

## Cuenta
- Titulo propio y distribucion en dos columnas desktop, apilada mobile.
- Contraseña primero y avisos despues.
- Campos legibles de 16px en mobile; labels de 12px.
- Mostrar/ocultar ambas contraseñas con boton de 44px y aria-pressed.
- Confirmacion de exito expresa actualizacion realizada, no una garantia de
  que nadie mas conoce la contraseña.
- Avisos usan variante compacta del componente existente, sin header duplicado.
- Variante original de notificaciones preservada para las demas pantallas.

## Archivos
- src/components/staff/StaffEarnings.tsx.
- src/components/staff/StaffPassword.tsx.
- src/components/staff/StaffNotifications.tsx.
- src/components/push/PushNotificationsCard.tsx.
- src/app/[barbershopSlug]/mi-agenda/cuenta/page.tsx.
- scripts/capture-admin-shell.mjs y fixtures staff-earnings/staff-account.

## Evidencia
- Capturas mobile/desktop de ganancias y cuenta.
- 360, 390, 768, 1024 y 1440px sin desbordes.
- Cambio de mes, volver al actual y errores con reintento comprobados.
- Fixtures de mes vacio, sin comision, error y permiso denegado.
- Mostrar/ocultar ambos campos y validar contraseñas diferentes comprobados.
- Pruebas existentes correctas.
- Lint sin errores; advertencia previa en scripts/test-crm-export.ts.

## Limites
Sin cambios de permisos, SQL, endpoints, reglas, comisiones o dependencias.
No se cambiaron contraseñas reales ni se activaron/desactivaron suscripciones.
Los siete estados push existentes se conservan; esta prueba visual no acredita
entrega real de notificaciones ni pruebas en dispositivos iOS fisicos.
Los modales de cargar/mover/bloquear turno siguen pendientes de revision visual.
