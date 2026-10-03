# Contratos de componentes — 031

No hay endpoints nuevos. El alta del sobreturno usa el mismo insert bajo RLS que el alta manual;
mover turnos sigue por `PATCH /api/admin/appointments/move` sin cambios.

## `AgendaCalendarGridView` (modificado)

```ts
type Props = {
  barbershopSlug: string;
  barbershopName: string;
  focusDate: string;                                   // YYYY-MM-DD
  barbers: BarberRow[];
  appointments: AppointmentRow[];                      // del día, ya filtrados
  weeklySchedulesByBarber: Record<string, BarberWeeklyScheduleRow[]>;
  dayOverridesByBarber: Record<string, BarberDayOverrideRow | null>;
  timeBlocksByBarber: Record<string, BarberTimeBlockRow[]>;   // NUEVO (H4)
  workingHours: { start: string; end: string; intervalMinutes: number };
  onMoveComplete: (move: AppointmentMove) => void;     // igual que hoy
  onOpenAppointment: (appointmentId: string) => void;  // NUEVO (D5)
  onCreateAt: (args: {                                  // NUEVO (H7)
    barberId: string;
    time: string;                                       // HH:MM
    mode: "turno" | "sobreturno";
  }) => void;
};
```

- Se dibuja también con cero turnos (H8). Los estados de carga/error siguen en el padre.
- Solo lectura (plan vencido o día pasado): sin `onCreateAt`, sin arrastre; `onOpenAppointment` sí.

## `AgendaBarberSwitcher` (nuevo, solo < 768 px)

```ts
type Props = {
  barbers: Array<{ id: string; name: string; count: number; offDay: boolean }>;
  selectedId: string;
  onSelect: (barberId: string) => void;
};
```
- `role="tablist"`, chips de 44 px, flechas izquierda/derecha con teclado.

## `AppointmentDetailSheet` (nuevo)

```ts
type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;   // la tarjeta de la vista Lista, con sus acciones
  title: string;               // "15:00 · Juan"
  badges?: Array<"encimado" | "sobreturno">;
};
```
- Hoja inferior < 768 px, panel lateral ≥ 768 px. Foco atrapado, Escape, restaura foco al bloque.

## `OverlapGroupList` (nuevo, "+N")

```ts
type Props = {
  open: boolean;
  onClose: () => void;
  turnos: AppointmentRow[];    // todos los del grupo
  onOpenAppointment: (id: string) => void;
};
```

## `ManualAppointmentModal` (modificado)

```ts
type NuevasProps = {
  defaultTime?: string;                    // HH:MM, desde el hueco tocado
  mode?: "turno" | "sobreturno";           // default "turno" (comportamiento actual)
  existingAppointments?: AppointmentRow[]; // del día, para la confirmación de FR-011
};
```
- `mode="sobreturno"`: duración editable (10/15/20/30, default 15), servicio opcional, guarda
  `is_sobreturno: true` y `service_duration_minutes` = duración elegida.
- Si la franja pisa a otro turno activo → diálogo de confirmación antes de guardar.

## `useMediaQuery` (nuevo hook)

```ts
function useMediaQuery(query: string): boolean; // useSyncExternalStore, false en SSR
```
