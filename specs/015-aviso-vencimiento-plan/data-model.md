# Data Model: Aviso de vencimiento del plan

## Tabla nueva: `plan_notice_log`

Recuerda qué aviso ya se envió, a qué barbería y para qué vencimiento.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `barbershop_slug` | `text not null` | FK → `barbershops(slug)` |
| `kind` | `text not null` | `check (kind in ('vence_3d','vence_hoy'))` |
| `period_ends_at` | `date not null` | El vencimiento al que corresponde el aviso |
| `sent_at` | `timestamptz not null` | `default now()` |
| `devices` | `int not null` | A cuántos dispositivos se encoló. `default 0` |

### Índice único — el candado

```sql
create unique index plan_notice_log_unico
  on public.plan_notice_log (barbershop_slug, kind, period_ends_at);
```

Es lo que garantiza SC-002: el segundo intento de registrar el mismo aviso
falla con `23505` y el cron lo interpreta como "ya estaba avisado". Que el
período forme parte de la clave es lo que permite volver a avisar el mes
siguiente.

### RLS

Prendida y sin políticas, igual que `rate_limit_hits`: solo la toca el
`service_role` desde el cron. Se revocan los permisos de `anon` y
`authenticated` explícitamente — las tablas nuevas nacen con permisos por
defecto para esos roles.

## Tablas que se leen (sin cambios)

- **`barbershop_subscriptions`** — `current_period_ends_at` (el vencimiento) y
  `status`. Se toman solo las que están al día con un vencimiento cargado.
- **`barbershop_admins`** — `user_id` + `barbershop_slug`: quién administra.
- **`push_subscriptions`** — dispositivos con notificaciones activas
  (`expired_at is null`), filtrados por los `user_id` de arriba.
- **`push_notification_queue`** — se inserta una fila por dispositivo; el
  webhook que ya existe se encarga de enviar.

## Payload del push

```json
{
  "title": "Tu plan vence en 3 días",
  "body": "Renová para que tu barbería siga tomando turnos online.",
  "url": "/<slug>/admin",
  "tag": "plan-vence-<slug>"
}
```

El `tag` hace que un aviso reemplace al anterior en la bandeja del celular en
vez de apilarse. El día del vencimiento el título pasa a "Tu plan vence hoy".
