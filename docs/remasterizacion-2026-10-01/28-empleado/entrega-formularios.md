# Empleado: agregar, mover y bloquear

Fecha: 2026-10-02. Zona 19. Cambios locales sin commit ni deploy.

## Presentacion
- Tres formularios consistentes: sheet inferior mobile y dialog centrado desktop.
- Encabezado y acciones sticky dentro del formulario, con altura basada en dvh.
- Safe-area inferior contemplada.
- Campos de 16px mobile y labels de 12px; controles de al menos 44px.
- Nota opcional mas compacta y textos largos sin truncar.
- Avisos importantes con mejor contraste; cierre deshabilitado mientras guarda.
- Dialogos con nombre accesible, foco inicial, ciclo Tab y retorno al opener.
- Fondo sin scroll mientras el formulario esta abierto.

## Correcciones UX acotadas
- Componentes remontan al cambiar fecha o turno para no conservar un dia viejo.
- Servicios distinguen cargando, error recuperable y lista vacia.
- Reintento conserva cliente y otros campos.
- Guardado no disponible mientras los servicios faltan o no cargaron.
- Validaciones y contratos de guardar/mover/bloquear permanecen iguales.

## Archivos
- src/components/staff/StaffNewAppointmentModal.tsx.
- src/components/staff/StaffBlockTimeModal.tsx.
- src/components/staff/StaffRescheduleModal.tsx.
- src/components/staff/useStaffDialogFocus.ts.
- src/components/staff/StaffAgenda.tsx.
- scripts/capture-admin-shell.mjs.

## Evidencia
- Playwright con fixtures, sin mutaciones productivas.
- Capturas mobile/desktop para los tres formularios y estados de validacion.
- 360, 390, 768, 1024 y 1440px sin desbordes; inputs sin overflow.
- Boton principal visible en viewport de 650px de alto.
- Escape, bloqueo del scroll, foco inicial, Shift+Tab y restauracion comprobados.
- Servicio obligatorio, cliente obligatorio, hora nueva obligatoria y rango
  invertido conservan sus validaciones.
- Fecha seleccionada 2026-10-02 comprobada en agregar y bloquear.
- Error/vacio de servicios deshabilita guardado; retry conserva cliente.
- npm run test:unit: correcto.
- npm run build: correcto, TypeScript y 223 paginas.
- Lint excluyendo .gstack: sin errores, warning previo en test-crm-export.ts.

## Limites
Sin SQL, dependencias, cambios de permisos, endpoints ni calculos.
No se crearon, movieron ni bloquearon turnos reales.
La entrega visual no acredita email/WhatsApp enviados ni resultado de
reprogramacion contra produccion. El flujo de resultado existente se preserva.
No se modifico la regla que bloquear un rango no cancela turnos existentes.
