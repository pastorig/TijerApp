"use client";

/**
 * AgendaCalendarGridView
 *
 * Vista tipo "Google Calendar" del turnero del admin:
 *
 *   ┌────────────┬────────────┬────────────┐
 *   │ HORA       │ JEREMIAS   │ MATEO      │
 *   ├────────────┼────────────┼────────────┤
 *   │ 09:00      │ [Cliente A]│            │
 *   │ 09:30      │ [Cliente B]│ [Cliente C]│
 *   │ 10:00      │            │ [Cliente D]│
 *   │ ...        │ ...        │ ...        │
 *   └────────────┴────────────┴────────────┘
 *
 * Drag vertical: cambiar hora dentro del mismo barbero.
 * Drag horizontal: cambiar barbero.
 * Cells vacías = drop targets disponibles.
 * Slots fuera del horario del barbero = bloqueados (no drop).
 *
 * Polish visual: paleta TijerApp (negro/gold/silver) + grid de horas con
 * separación cada hora completa (línea más gruesa).
 */

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { Clock, GripVertical } from "lucide-react";
import { useToast } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import type {
  AppointmentRow,
  BarberDayOverrideRow,
  BarberRow,
  BarberWeeklyScheduleRow,
} from "@/lib/supabase";
import {
  getBarberDaySchedule,
  type BarberDaySchedule,
} from "./agenda-schedule-helpers";

type AgendaCalendarGridViewProps = {
  barbershopSlug: string;
  focusDate: string;
  barbers: BarberRow[];
  appointments: AppointmentRow[];
  weeklySchedulesByBarber: Record<string, BarberWeeklyScheduleRow[]>;
  dayOverridesByBarber: Record<string, BarberDayOverrideRow | null>;
  workingHours: {
    start: string;
    end: string;
    intervalMinutes: number;
  };
  onMoveComplete: (updated: {
    id: string;
    appointment_date: string;
    appointment_time: string;
    barber_id: string;
    barber_name: string;
  }) => void;
};

const SLOT_HEIGHT_PX = 56; // Altura de cada slot en la grilla

function timeToMinutes(time: string): number {
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

function minutesToTimeLabel(minutes: number): string {
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * Genera todos los slots de tiempo entre start y end con un step dado.
 * Ej: start="09:00", end="20:00", step=30 → ["09:00", "09:30", ..., "19:30"]
 */
function generateTimeSlots(
  start: string,
  end: string,
  stepMinutes: number,
): string[] {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  const slots: string[] = [];
  for (let t = startMin; t < endMin; t += stepMinutes) {
    slots.push(minutesToTimeLabel(t));
  }
  return slots;
}

/**
 * Genera el ID droppable de una cell. Usado para identificar el target
 * al soltar el card.
 */
function makeDroppableId(barberId: string, time: string): string {
  return `slot:${barberId}:${time}`;
}

function parseDroppableId(
  id: string,
): { barberId: string; time: string } | null {
  const parts = id.split(":");
  if (parts.length !== 4 || parts[0] !== "slot") return null;
  // ID format: "slot:<barberId>:HH:MM" → parts = ["slot", uuid, "HH", "MM"]
  // Reconstruimos: barberId = parts[1], time = parts[2]+":"+parts[3]
  return { barberId: parts[1], time: `${parts[2]}:${parts[3]}` };
}

/**
 * Card draggable de un appointment. Click + drag = mover.
 */
function DraggableAppointmentCard({
  appointment,
  isOverlay = false,
}: {
  appointment: AppointmentRow;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `appt:${appointment.id}`,
    data: { appointment },
  });

  const statusColor =
    appointment.status === "confirmed"
      ? "border-[color:var(--success)]/40 bg-[color:var(--success-soft)]"
      : appointment.status === "pending"
        ? "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)]"
        : "border-[color:var(--text-subtle)]/40 bg-[color:var(--surface-2)]";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "group relative cursor-grab rounded-[var(--radius-sm)] border p-2 text-left transition-shadow active:cursor-grabbing",
        statusColor,
        isDragging && !isOverlay && "opacity-30",
        isOverlay && "shadow-elevated",
      )}
      style={{
        minHeight: SLOT_HEIGHT_PX - 4,
      }}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical
          aria-hidden="true"
          className="mt-0.5 size-3 shrink-0 text-[color:var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold leading-tight text-white">
            {appointment.customer_name}
          </p>
          <p className="truncate text-[9px] leading-tight text-[color:var(--text-secondary)]">
            {appointment.service_name}
          </p>
          <p className="mt-0.5 font-mono text-[9px] text-[color:var(--text-muted)]">
            {appointment.appointment_time.slice(0, 5)}
            {" · "}
            {appointment.service_duration_minutes}min
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Cell droppable. Si está dentro del horario del barbero y no hay
 * appointment activo en ese slot, acepta drop.
 */
function DroppableSlot({
  barberId,
  time,
  isInWorkingHours,
  isOccupied,
  children,
}: {
  barberId: string;
  time: string;
  isInWorkingHours: boolean;
  isOccupied: boolean;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: makeDroppableId(barberId, time),
    disabled: !isInWorkingHours || isOccupied,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative border-r border-b border-[color:var(--border-subtle)] p-0.5 transition-colors",
        !isInWorkingHours &&
          "bg-[color:var(--surface-0)] [background-image:linear-gradient(135deg,transparent_46%,var(--border-subtle)_46%,var(--border-subtle)_54%,transparent_54%)] [background-size:8px_8px]",
        isInWorkingHours &&
          !isOccupied &&
          isOver &&
          "bg-[color:var(--brand-gold-soft)] ring-2 ring-[color:var(--brand-gold)] ring-inset",
        isInWorkingHours &&
          !isOccupied &&
          !isOver &&
          "hover:bg-[color:var(--surface-2)]/40",
      )}
      style={{ height: SLOT_HEIGHT_PX }}
    >
      {children}
    </div>
  );
}

export function AgendaCalendarGridView({
  barbershopSlug,
  focusDate,
  barbers,
  appointments,
  weeklySchedulesByBarber,
  dayOverridesByBarber,
  workingHours,
  onMoveComplete,
}: AgendaCalendarGridViewProps) {
  const toast = useToast();
  const [activeAppointment, setActiveAppointment] =
    useState<AppointmentRow | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Drag inicia después de mover 6px — evita disparar drag por click accidental
      activationConstraint: { distance: 6 },
    }),
  );

  // 1. Calcular barberos del día activos (con horario válido)
  const activeBarbersWithSchedule = useMemo(() => {
    return barbers
      .map((barber) => {
        const schedule = getBarberDaySchedule({
          barberId: barber.id,
          date: focusDate,
          weeklySchedulesByBarber,
          dayOverridesByBarber,
          workingHours,
          focusDate,
        });
        return { barber, schedule };
      })
      .filter((entry): entry is { barber: BarberRow; schedule: BarberDaySchedule } =>
        Boolean(entry.schedule?.isWorking),
      );
  }, [
    barbers,
    focusDate,
    weeklySchedulesByBarber,
    dayOverridesByBarber,
    workingHours,
  ]);

  // 2. Calcular el rango total de horas a mostrar (min start, max end de
  //    todos los barberos del día) — así la grilla cubre el día entero.
  const { gridStartTime, gridEndTime } = useMemo(() => {
    if (activeBarbersWithSchedule.length === 0) {
      return {
        gridStartTime: workingHours.start,
        gridEndTime: workingHours.end,
      };
    }
    let minStart = Number.POSITIVE_INFINITY;
    let maxEnd = 0;
    for (const { schedule } of activeBarbersWithSchedule) {
      minStart = Math.min(minStart, timeToMinutes(schedule.startTime));
      maxEnd = Math.max(maxEnd, timeToMinutes(schedule.endTime));
    }
    return {
      gridStartTime: minutesToTimeLabel(minStart),
      gridEndTime: minutesToTimeLabel(maxEnd),
    };
  }, [activeBarbersWithSchedule, workingHours]);

  // 3. Generar slots de tiempo de toda la grilla
  const timeSlots = useMemo(
    () =>
      generateTimeSlots(
        gridStartTime,
        gridEndTime,
        workingHours.intervalMinutes,
      ),
    [gridStartTime, gridEndTime, workingHours.intervalMinutes],
  );

  // 4. Indexar appointments por (barberId, time) para acceso O(1)
  const appointmentsByBarberAndTime = useMemo(() => {
    const map = new Map<string, AppointmentRow>();
    for (const appointment of appointments) {
      if (appointment.appointment_date !== focusDate) continue;
      if (
        appointment.status !== "pending" &&
        appointment.status !== "confirmed"
      ) {
        continue;
      }
      const time = appointment.appointment_time.slice(0, 5);
      map.set(`${appointment.barber_id}:${time}`, appointment);
    }
    return map;
  }, [appointments, focusDate]);

  function isSlotInBarberWorkingHours(
    barberSchedule: BarberDaySchedule,
    time: string,
  ): boolean {
    const slotMin = timeToMinutes(time);
    const start = timeToMinutes(barberSchedule.startTime);
    const end = timeToMinutes(barberSchedule.endTime);
    return slotMin >= start && slotMin < end;
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as
      | { appointment?: AppointmentRow }
      | undefined;
    if (data?.appointment) {
      setActiveAppointment(data.appointment);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveAppointment(null);
    const { active, over } = event;
    if (!over) return;

    const data = active.data.current as
      | { appointment?: AppointmentRow }
      | undefined;
    if (!data?.appointment) return;
    const appointment = data.appointment;

    const dropTarget = parseDroppableId(String(over.id));
    if (!dropTarget) return;

    const currentTime = appointment.appointment_time.slice(0, 5);
    const noChange =
      dropTarget.barberId === appointment.barber_id &&
      dropTarget.time === currentTime;
    if (noChange) return;

    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Tu sesión expiró, volvé a iniciar sesión.");
        return;
      }

      const res = await fetch("/api/admin/appointments/move", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          barbershopSlug,
          newTime: dropTarget.time,
          newBarberId: dropTarget.barberId,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("No pudimos mover el turno", {
          description: err.error ?? `HTTP ${res.status}`,
        });
        return;
      }

      const result = (await res.json()) as {
        ok: boolean;
        changed?: boolean;
        appointment?: {
          id: string;
          appointment_date: string;
          appointment_time: string;
          barber_id: string;
          barber_name: string;
        };
      };
      if (result.changed === false) return;
      if (!result.appointment) return;

      toast.success("Turno movido", {
        description: `${appointment.customer_name} → ${dropTarget.time}`,
      });
      onMoveComplete(result.appointment);
    } catch (err) {
      console.warn("[agenda] move failed:", err);
      toast.error("Error moviendo el turno", {
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  if (activeBarbersWithSchedule.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-8 text-center">
        <Clock
          aria-hidden="true"
          className="mx-auto size-8 text-[color:var(--text-muted)]"
        />
        <p className="mt-3 text-sm font-semibold text-white">
          Sin barberos trabajando este día
        </p>
        <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
          No hay agenda para mostrar en formato calendario.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)]">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `80px repeat(${activeBarbersWithSchedule.length}, minmax(140px, 1fr))`,
          }}
        >
          {/* Header row: hora vacía + nombres de barberos */}
          <div className="sticky top-0 z-10 border-r border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-2)] p-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            Hora
          </div>
          {activeBarbersWithSchedule.map(({ barber, schedule }) => (
            <div
              key={`header-${barber.id}`}
              className="sticky top-0 z-10 border-r border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-2)] p-2"
            >
              <p className="text-[11px] font-bold uppercase tracking-tight text-white">
                {barber.display_name?.trim() || barber.name}
              </p>
              <p className="mt-0.5 font-mono text-[9px] text-[color:var(--text-muted)]">
                {schedule.startTime.slice(0, 5)} – {schedule.endTime.slice(0, 5)}
              </p>
            </div>
          ))}

          {/* Filas de slots */}
          {timeSlots.map((time) => {
            const isFullHour = time.endsWith(":00");
            return (
              <Each key={`row-${time}`}>
                {/* Etiqueta de hora (columna izquierda) */}
                <div
                  className={cn(
                    "border-r border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] p-2 text-right",
                    isFullHour && "border-b-[color:var(--border-default)]",
                  )}
                  style={{ height: SLOT_HEIGHT_PX }}
                >
                  <span
                    className={cn(
                      "font-mono text-[10px]",
                      isFullHour
                        ? "font-bold text-white"
                        : "text-[color:var(--text-muted)]",
                    )}
                  >
                    {time}
                  </span>
                </div>

                {/* Cells por barbero */}
                {activeBarbersWithSchedule.map(({ barber, schedule }) => {
                  const inWorking = isSlotInBarberWorkingHours(schedule, time);
                  const appointment = appointmentsByBarberAndTime.get(
                    `${barber.id}:${time}`,
                  );
                  return (
                    <DroppableSlot
                      key={`cell-${barber.id}-${time}`}
                      barberId={barber.id}
                      time={time}
                      isInWorkingHours={inWorking}
                      isOccupied={Boolean(appointment)}
                    >
                      {appointment ? (
                        <DraggableAppointmentCard appointment={appointment} />
                      ) : null}
                    </DroppableSlot>
                  );
                })}
              </Each>
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeAppointment ? (
          <div className="w-[140px]">
            <DraggableAppointmentCard
              appointment={activeAppointment}
              isOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Helper component para mantener fragmentos clave del map. React Fragment
 * no soporta keys cuando lo retorna .map() de forma encadenada con varios
 * elementos por iteración (etiqueta de hora + cells por barbero), así
 * que envolvemos en este wrapper invisible para que cada row tenga su key
 * pero el grid CSS siga viendo todos los children como hijos directos.
 *
 * Implementación: react fragments con key sí funcionan en .map(). Esto
 * es solo azúcar sintáctico para hacer el JSX más legible.
 */
function Each({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
