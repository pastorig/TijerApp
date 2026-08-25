# Data Model: Cuentas para empleados

## Tabla nueva: `barber_staff_access`

Vincula una cuenta con **un barbero** de **una barbería**.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid not null` | FK → `auth.users` |
| `barbershop_slug` | `text not null` | FK → `barbershops(slug)` |
| `barber_id` | `uuid not null` | FK → `barbers(id)`. La agenda que maneja |
| `granted_by` | `uuid not null` | Qué dueño le dio el acceso |
| `granted_at` | `timestamptz` | `default now()` |
| `revoked_at` | `timestamptz null` | `null` = activo |

### Índices

```sql
-- Un barbero, un acceso activo. Dos personas manejando la misma agenda no es
-- un caso que exista en una barbería.
create unique index barber_staff_access_barbero_activo
  on public.barber_staff_access (barbershop_slug, barber_id)
  where revoked_at is null;

-- Resolver "quién es este usuario" en cada request.
create index barber_staff_access_lookup
  on public.barber_staff_access (user_id, barbershop_slug)
  where revoked_at is null;
```

### Por qué NO va en `barbershop_admins`

Es la decisión de seguridad de toda la feature. Toda la protección de la base
cuelga de `current_user_has_barbershop_access()`, que consulta **esa** tabla.
Un empleado que no está ahí no pasa el chequeo y **no puede leer nada** por el
cliente de Supabase, sin escribir una sola política nueva.

Meterlo en `barbershop_admins` con una columna `role` lo dejaría adentro del
chequeo, y a partir de ahí habría que ir tapando agujeros de a uno.

> ⚠️ Mover una fila de acá a `barbershop_admins` le da acceso total a la
> barbería. Este comentario va en la migración.

### RLS

Prendida. El empleado puede **leer su propia fila** (para que la app sepa quién
es) y nada más. Escribir solo el `service_role`, desde las rutas del dueño.

## Cambio en `appointments`

| Columna | Tipo | Notas |
|---|---|---|
| `status_changed_by` | `uuid null` | Quién confirmó o canceló por última vez |
| `status_changed_at` | `timestamptz null` | Cuándo |

Aditivo: las filas viejas quedan en `null`, que se lee como "antes de que esto
existiera". No se inventa un responsable retroactivo.

## Lo que se lee sin cambios

- **`barbers`** — `commission_percent` ya existe (feature 014).
- **`appointments`** — filtrados por `barber_id`, siempre resuelto en el server.

  ⚠️ **Ojo con los tipos:** `barbers.id` es `uuid` pero
  `appointments.barber_id` es `text` (y admite null). Al filtrar hay que
  comparar contra el uuid **como texto**. Si no, no falla: devuelve cero
  turnos, que es peor que un error.
- **`barbershop_subscriptions`** — el empleado hereda el modo lectura si el
  plan venció.
