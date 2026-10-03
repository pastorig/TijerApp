# Data Model: 031 — Calendario de la agenda

## Cambio en la base (único)

### `appointments.is_sobreturno`

```sql
alter table public.appointments
  add column if not exists is_sobreturno boolean not null default false;
```

- Lo setea solo el alta manual del admin en modo sobreturno (insert desde el cliente bajo RLS
  `appointments_admin_insert_own_barbershop`, que es por fila: la columna nueva queda cubierta).
- La reserva pública, la lista de espera y el alta del empleado insertan con service role y no la
  mandan → `false` por default.
- No cambia RLS ni RPCs públicas. La disponibilidad sigue contando todo turno `pending`/`confirmed`,
  sobreturnos incluidos (FR-010).

### Índice único de horario activo

Hoy (`20260526120000_appointments_unique_active_slot.sql`):
`unique (barbershop_slug, barber_id, appointment_date, appointment_time) where status in ('pending','confirmed')`.

Pasa a:

```sql
drop index if exists public.appointments_unique_active_slot;
create unique index appointments_unique_active_slot
  on public.appointments (barbershop_slug, barber_id, appointment_date, appointment_time)
  where status in ('pending', 'confirmed') and not is_sobreturno;
```

- Sigue frenando dos reservas comunes a la misma hora (la protección anti doble reserva del alta
  pública no cambia).
- Permite un sobreturno a la misma hora exacta que otro turno (caso real: "lo atiendo ya, al de
  las 15:00 lo hago esperar").

### Tipos y selects a actualizar
- `src/lib/supabase.ts` → `AppointmentInsert.is_sobreturno?: boolean`.
- `src/lib/appointments.ts` → `APPOINTMENT_SELECT` (obligatorio: alimenta el turnero; sin esto llega
  `undefined` y la marca se apaga sola) y el select de retorno de `updateAppointmentActualDuration`.

## Modelos calculados (no se guardan) — `src/lib/agenda-layout.ts`

```ts
type TurnoParaLayout = {
  id: string;
  inicioMin: number;        // minutos desde 00:00
  duracionMin: number;      // actual ?? servicio (D3)
  esSobreturno: boolean;
};

type BloqueDibujado = {
  id: string;
  topPx: number;
  altoPx: number;           // max(duración, 14) * 2
  izquierdaPct: number;
  anchoPct: number;
  carril: number;
  grupoId: number;
  compacto: boolean;        // altoPx < 56
  encimado: boolean;        // grupo con 2+ turnos comunes
  oculto: boolean;          // carril >= 2 → va dentro del "+N"
};

type GrupoDibujado = {
  id: number;
  inicioMin: number;
  finMin: number;
  carriles: number;
  ocultos: string[];        // ids que van en "+N"
};

type FranjaNoDisponible = {
  tipo: "pausa" | "bloqueo" | "fuera-de-horario";
  inicioMin: number;
  finMin: number;
  etiqueta: string;
};

type HuecoLibre = { inicioMin: number; finMin: number };
```

Funciones puras:
- `layoutDia(turnos, inicioReglaMin, opciones)` → `{ bloques, grupos }` (D1, D2, D8).
- `rangoDelDia(jornadas, turnos)` → `{ inicioMin, finMin }` redondeado a la hora (D9).
- `huecosLibres(jornada, turnos, franjas)` → `HuecoLibre[]` (punto de partida del sobreturno).
- `pisaAOtro(nuevo, turnos)` → `boolean` (confirmación de FR-011).

## Estado de UI (no persistente salvo indicado)
- Barbero visible en celular → `sessionStorage` `tijerapp:agenda:barbero:<slug>`.
- Turno abierto en la hoja de detalle, grupo abierto en "+N", modo del alta manual.
