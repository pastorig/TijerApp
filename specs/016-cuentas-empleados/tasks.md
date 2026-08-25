# Tasks: Cuentas para empleados

**Branch**: `016-cuentas-empleados`
Orden por dependencia. `[P]` = paralelizable con la anterior.

## Fase 1 — La base

- [ ] **T001** Migración `barber_staff_access`: tabla + los dos índices + RLS
      prendida (el empleado lee solo su fila) + `revoke` a `anon`. Con el
      comentario de por qué NO va en `barbershop_admins`.
- [ ] **T002** Migración: `status_changed_by` + `status_changed_at` en
      `appointments`. Aditiva, las filas viejas quedan en null.
- [ ] **T003** Aplicar las dos (Claude, por MCP de Supabase).

## Fase 2 — Quién es quién

- [ ] **T004** `src/lib/server/staff-access.ts`: `resolveStaffAccess(userId, slug)`
      → `{ barberId, barberName } | null`, leyendo solo accesos sin revocar.
      **Server-only.** Es la única fuente del `barber_id`: nunca llega del
      cliente.
- [ ] **T005** `src/lib/staff-routing.ts` (puro): dado si es admin y si es
      staff, decide el destino post-login. Con tests: admin → panel, staff →
      mi-agenda, las dos cosas → panel (el dueño manda), ninguna → login con
      error.
- [ ] **T006** Enganchar el destino en el login y en `/abrir` (el arranque de
      la PWA), para que el empleado abra la app en su agenda.

## Fase 3 — Lo que ve el empleado

- [ ] **T007** `/[slug]/mi-agenda`: sus turnos del día. El server carga
      filtrando por el `barber_id` de T004. Reusa los componentes del turnero,
      no sus rutas.
- [ ] **T008** `POST /api/staff/appointment-status`: confirmar/cancelar.
      **Verifica que el turno sea de su barbero antes de escribir** y guarda
      `status_changed_by` / `status_changed_at`.
- [ ] **T009** `/[slug]/mi-agenda/ganancias`: su comisión del período con
      `calculateCommissions` (014). Sin comisión configurada → el aviso
      explícito, nunca $0.
- [ ] **T010** [P] Selector de período para ver meses anteriores.
- [ ] **T011** Modo lectura: con el plan vencido, el empleado ve pero no toca,
      igual que el dueño (reusa `assertPlanActive`).

## Fase 4 — Lo que hace el dueño

- [ ] **T012** En Equipo: "Darle acceso" por barbero (pide email) y "Quitar
      acceso". Endpoints `POST`/`DELETE /api/admin/staff-access`, solo dueño.
- [ ] **T013** La invitación crea el usuario y le manda el mail para que ponga
      su contraseña. **El dueño nunca elige ni ve la contraseña.**
- [ ] **T014** [P] En el turno, mostrarle al dueño quién cambió el estado.

## Fase 5 — Verificación

- [ ] **T015** Tests unitarios: ruteo post-login (T005) y la regla de "sin
      comisión configurada no es $0".
- [ ] **T016** **Prueba de que el empleado NO llega a lo del dueño.** Con un
      acceso real de prueba: pegarle a los endpoints del admin y a las rutas
      del panel con su sesión y confirmar que no obtiene datos. Ojo: mirar el
      **payload**, no el status — un 200 vacío y un 200 con datos se parecen
      demasiado (lección de Fixfono 090/091).
- [ ] **T017** Verificar que la comisión del empleado y la del dueño para el
      mismo período dan **el mismo número**.
- [ ] **T018** `tsc` + `lint` + `test:unit` + `build`.
- [ ] **T019** Mirar las dos pantallas en celular (andamio + headless, como en
      la 013: el panel no loguea headless).

## Fase 6 — Cierre

- [ ] **T020** Merge a `main` + push + borrar la rama.
- [ ] **T021** Documentar en el manual del dueño cómo dar y quitar acceso.

## Lo que NO se hace

- Que el empleado cargue turnos.
- Que edite horarios, servicios o precios.
- Roles intermedios (recepcionista, encargado).
- Liquidar o pagar desde la app.

## Antes de arrancar

Falta que Bautista confirme las dos decisiones del final del spec: **desde qué
plan** está disponible y **si hay tope** de accesos.
