# Implementation Plan: Cuentas para empleados

**Branch**: `016-cuentas-empleados` | **Date**: 2026-08-24
**Spec**: [spec.md](./spec.md)

## Technical Context

**Stack**: TypeScript · Next.js 16 (App Router) · Supabase (Auth + Postgres)
**Dependencias nuevas**: ninguna
**Migración**: sí, dos (tabla de accesos + registro de quién cambió el turno)

## La decisión de fondo

Se eligió **superficie aparte** en vez de filtrar el panel del dueño por rol.

Filtrar el panel significa que cada una de las ~10 pantallas y las decenas de
endpoints que ya existen tengan que preguntar "¿este es un empleado?", hoy y
**cada vez que agreguemos una pantalla nueva, para siempre**. Un olvido no es
un bug cosmético: es la lista de clientes o la facturación de la barbería. Ya
pasó en Fixfono con los permisos por ruta.

Con superficie aparte, el empleado no ve el resto **porque no existe la ruta**,
no porque la escondimos.

### Lo que hace que esto sea seguro sin esfuerzo

El acceso del empleado va en una tabla nueva, **no en `barbershop_admins`**.

Eso importa más de lo que parece: toda la seguridad de la base cuelga de
`current_user_has_barbershop_access()`, que mira **exactamente esa tabla**. Un
empleado que no está ahí **no pasa ese chequeo**, así que no puede leer
appointments, clientes ni nada por el cliente de Supabase — sin que toquemos
una sola política. Su información llega únicamente por las rutas de servidor
que escribamos, ya filtrada.

O sea: el default es "no ve nada", y cada cosa que ve es una decisión explícita.

## Arquitectura

```
LOGIN (el que ya existe, /[slug]/admin/login)
        │
        └── al entrar, se resuelve a dónde va:
             ├── está en barbershop_admins  → /[slug]/admin        (lo de siempre)
             └── está en barber_staff_access → /[slug]/mi-agenda   (NUEVO)
                                                    │
                        ┌───────────────────────────┴──────────────┐
                        │                                          │
                 Mis turnos                                 Mis ganancias
       (server carga SOLO los de su barber_id)     (calculateCommissions, 014)
                        │
              confirmar / cancelar
              → deja registrado quién y cuándo
```

**El `barber_id` NUNCA viene del cliente.** Sale de la fila de acceso del
usuario logueado, resuelta en el servidor. Si viniera del request, el empleado
podría pedir la agenda de un compañero cambiando un número.

## Piezas

| Pieza | Qué hace |
|---|---|
| `barber_staff_access` (tabla) | Vincula usuario ↔ barbero ↔ barbería. Revocable. |
| `resolveStaffAccess(userId, slug)` | Server-only. Devuelve el barbero del empleado, o nada. |
| `/[slug]/mi-agenda` | Sus turnos del día, con confirmar y cancelar. |
| `/[slug]/mi-agenda/ganancias` | Su comisión del período, con `calculateCommissions`. |
| `POST /api/staff/appointment-status` | Confirmar/cancelar. Verifica que el turno **sea de su barbero** antes de tocar nada. |
| Equipo (pantalla del dueño) | Dar y quitar acceso. |
| `status_changed_by` en `appointments` | Quién confirmó o canceló, y cuándo. |

## Decisiones de diseño

### Un solo login, dos destinos

No se arma un login aparte: el empleado usa el mismo formulario y el sistema
decide a dónde mandarlo. Un login separado sería otra pantalla que mantener y
otra puerta que auditar, para el mismo resultado.

### La comisión se muestra, no se recalcula

Se usa `calculateCommissions` (feature 014), la misma función que alimenta
Reportes, el PDF y el WhatsApp de liquidación. Si el empleado viera un número
calculado en otro lado, tarde o temprano diferiría del que ve el dueño — y esa
diferencia es una discusión con plata de por medio. El código de 014 ya avisa
de esto en su comentario de cabecera.

### Se registra quién tocó el turno

`status_changed_by` + `status_changed_at` en `appointments`. Hoy no se sabe
quién canceló, y en cuanto un empleado pueda cancelar el dueño va a querer
saberlo. Sumarlo después de tener datos es mucho más caro que ahora.

### Sin acceso ≠ sin historial

Revocar el acceso escribe `revoked_at`, no borra la fila ni toca los turnos.
El empleado se va, la barbería conserva todo.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El empleado llega a datos del dueño por otra ruta | No está en `barbershop_admins` → RLS lo frena solo. Las rutas nuevas filtran por su `barber_id` en el server |
| Confirmar/cancelar el turno de otro | El endpoint compara el turno contra el `barber_id` del acceso antes de escribir |
| El empleado se va y sigue entrando | Revocar tiene efecto inmediato: se chequea en cada request, no en el login |
| La comisión no coincide con la del dueño | Misma función, cubierta por los tests de 014 |
| Alguien "arregla" esto moviendo el empleado a `barbershop_admins` | Queda documentado en la tabla: eso le daría acceso total |

## Artefactos

- [data-model.md](./data-model.md)
- [tasks.md](./tasks.md)
