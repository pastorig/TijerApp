# Data Model — Excepción de horario por rango de días

## `barber_day_overrides` (existe; se le agregan columnas)

Una fila = **un barbero, un día**. El rango de la pantalla se expande a N filas.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | ya existe |
| `created_at` | timestamptz | ya existe |
| `barbershop_slug` | text | ya existe · aísla el tenant |
| `barber_id` | uuid | ya existe · FK a `barbers`, on delete cascade |
| `override_date` | date | ya existe · unique junto a `barber_id` |
| `start_time` | time | ya existe |
| `end_time` | time | ya existe · check `start_time < end_time` |
| `is_working` | boolean | ya existe · `false` = día libre puntual |
| `deleted_at` | timestamptz | ya existe · borrado blando |
| **`hereda_pausa`** | **boolean not null default true** | **nuevo** · true = usa la pausa de la regla semanal |
| **`break_start`** | **time null** | **nuevo** · solo se mira si `hereda_pausa = false` |
| **`break_end`** | **time null** | **nuevo** · idem |
| **`nota`** | **text null** | **nuevo** · "horas extra", "vacaciones" · solo la ve la barbería |

### Los tres estados de la pausa

| `hereda_pausa` | `break_start` / `break_end` | Qué pasa ese día |
|---|---|---|
| `true` (default) | ignorados | Se usa la pausa de la regla semanal. **Arregla las filas que ya existen.** |
| `false` | ambos con hora | Pausa propia de ese día |
| `false` | ambos null | **Ese día no para**: sin pausa |

Dos columnas no alcanzan porque los estados son tres. Sin el booleano, "sin pausa" y "heredar" serían el mismo null.

### Restricciones nuevas

```sql
alter table public.barber_day_overrides
  add column if not exists hereda_pausa boolean not null default true,
  add column if not exists break_start time,
  add column if not exists break_end time,
  add column if not exists nota text;

-- La pausa propia va completa o no va: media pausa no significa nada.
alter table public.barber_day_overrides
  add constraint barber_day_overrides_pausa_completa
  check (
    (break_start is null and break_end is null)
    or (break_start is not null and break_end is not null and break_start < break_end)
  );

-- Y tiene que caer adentro de la jornada, o taparía horarios que no existen.
alter table public.barber_day_overrides
  add constraint barber_day_overrides_pausa_dentro_de_jornada
  check (
    break_start is null
    or (break_start >= start_time and break_end <= end_time)
  );
```

`default true` en `hereda_pausa` es lo que arregla el bug para las 16 filas que ya están cargadas, sin backfill.

### Lo que NO cambia

- El unique `(barber_id, override_date)` se queda como está. Como el borrado es blando y la escritura es un upsert con `onConflict`, nunca se choca: reactivar una fecha borrada es el mismo upsert poniendo `deleted_at = null`.
- Las políticas RLS se quedan como están: lectura pública de las no borradas (la necesita la página de reserva), escritura solo con acceso a esa barbería.
- No hace falta índice nuevo: el que hay ya cubre `(barbershop_slug, barber_id, override_date)`.

## Entidad derivada — `JornadaDelDia` (en memoria, no se guarda)

Lo que devuelve `resolverJornadaDelDia()`. Es **la única** respuesta a "¿cómo es el día de este barbero en esta fecha?".

```ts
type JornadaDelDia = {
  trabaja: boolean;
  inicio: string;   // "HH:MM"
  fin: string;      // "HH:MM"
  pausa: { inicio: string; fin: string } | null;
  /** De dónde salió: sirve para explicarlo en pantalla y para debuggear. */
  origen: "excepcion" | "regla-semanal" | "horario-barberia";
};
```

Entradas: la fecha, la regla semanal de ese día de la semana, la excepción de esa fecha (si hay) y el horario general de la barbería.

**Todo lo demás se aplica encima de esto y no lo modifica**: bloqueos puntuales, turnos tomados, lo que ya pasó y la anticipación mínima. Esa es la separación que evita los bugs de horario.
