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
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { CalendarX, Clock, GripVertical, Move } from "lucide-react";
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
import {
  RescheduleNotifyDialog,
  type RescheduleNotifyContext,
} from "./RescheduleNotifyDialog";

type AgendaCalendarGridViewProps = {
  barbershopSlug: string;
  /** Nombre de la barbería para el subject del email y el WhatsApp. */
  barbershopName: string;
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

/**
 * Devuelve hoy en formato "YYYY-MM-DD" en zona horaria local del browser.
 * Usado para deshabilitar drag en fechas pasadas (no tiene sentido mover
 * un turno de hace 2 días — no tiene a dónde moverlo lógicamente).
 */
function getTodayYmd(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
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
 *
 * Si isLocked=true (turno de fecha pasada), el card se renderiza con
 * opacity reducida y NO es draggable. Visualmente parece "archivado".
 */
function DraggableAppointmentCard({
  appointment,
  isOverlay = false,
  isLocked = false,
  wasRecentlyDropped = false,
}: {
  appointment: AppointmentRow;
  isOverlay?: boolean;
  isLocked?: boolean;
  wasRecentlyDropped?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `appt:${appointment.id}`,
    data: { appointment },
    disabled: isLocked,
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
        "group relative rounded-[var(--radius-sm)] border p-2 text-left transition-all",
        // touch-none evita que el browser de mobile intercepte el touch
        // event como scroll/zoom mientras se inicia el drag (long-press).
        // Sin esto, el browser puede comerse el touch antes de que dnd-kit
        // detecte el long-press de 200ms.
        !isLocked && "touch-none select-none",
        statusColor,
        isLocked
          ? "cursor-not-allowed opacity-60 [filter:saturate(0.5)]"
          : "cursor-grab hover:shadow-elevated hover:scale-[1.02] active:cursor-grabbing",
        isDragging &&
          !isOverlay &&
          "opacity-20 scale-95 [filter:blur(0.5px)]",
        isOverlay &&
          "shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8),0_0_30px_-5px_color-mix(in_oklab,var(--brand-gold)_40%,transparent)] scale-105 rotate-[-1.5deg] ring-2 ring-[color:var(--brand-gold)]",
        // Animación bounce de aterrizaje cuando el card recién fue movido.
        // El parent (GridView) setea wasRecentlyDropped por 700ms.
        wasRecentlyDropped && !isOverlay && "animate-drop-land",
      )}
      style={{
        minHeight: SLOT_HEIGHT_PX - 4,
      }}
      title={isLocked ? "Este turno ya pasó, no se puede mover" : undefined}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-3 shrink-0 text-[color:var(--brand-gold)] transition-opacity",
            isLocked
              ? "hidden"
              : "opacity-0 group-hover:opacity-100",
          )}
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
 *
 * Visual states:
 *  - fuera de horario: hatching diagonal (no drop)
 *  - ocupada: pasa transparente (no drop)
 *  - vacía + drag activo: pulsa con borde gold (drop target)
 *  - vacía + over: highlight sólido gold
 *  - locked (día pasado): solo render, no drop activo
 */
function DroppableSlot({
  barberId,
  time,
  isInWorkingHours,
  isOccupied,
  isDayLocked,
  isDragActive,
  children,
}: {
  barberId: string;
  time: string;
  isInWorkingHours: boolean;
  isOccupied: boolean;
  isDayLocked: boolean;
  isDragActive: boolean;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: makeDroppableId(barberId, time),
    disabled: !isInWorkingHours || isOccupied || isDayLocked,
  });

  const isAvailableDropTarget =
    isInWorkingHours && !isOccupied && !isDayLocked;
  const showDragHint = isAvailableDropTarget && isDragActive;
  // Slot ocupado durante drag activo → tooltip "Ocupado" al hover
  const showBusyTooltip = isOccupied && isDragActive && !isDayLocked;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative border-r border-b border-[color:var(--border-subtle)] p-0.5 transition-all duration-150",
        !isInWorkingHours &&
          "bg-[color:var(--surface-0)] [background-image:linear-gradient(135deg,transparent_46%,var(--border-subtle)_46%,var(--border-subtle)_54%,transparent_54%)] [background-size:8px_8px]",
        // Drag activo + slot disponible: pulsa con border gold
        showDragHint &&
          !isOver &&
          "bg-[color:var(--brand-gold-soft)]/30 ring-1 ring-[color:var(--brand-gold)]/40 ring-inset",
        // Hover over: highlight sólido + animación pulse para destacar
        isOver &&
          "bg-[color:var(--brand-gold-soft)] ring-2 ring-[color:var(--brand-gold)] ring-inset scale-[1.02] z-10 animate-drop-target-pulse",
        // Idle hover (sin drag activo): leve highlight
        isAvailableDropTarget &&
          !isDragActive &&
          "hover:bg-[color:var(--surface-2)]/40",
        // Slot ocupado + drag activo: muestra tooltip "Ocupado" al hover
        showBusyTooltip && "busy-slot-tooltip",
      )}
      style={{ height: SLOT_HEIGHT_PX }}
    >
      {children}
    </div>
  );
}

export function AgendaCalendarGridView({
  barbershopSlug,
  barbershopName,
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
  const [notifyContext, setNotifyContext] =
    useState<RescheduleNotifyContext | null>(null);
  // Trackeamos qué appointment recién se movió para animarlo con el
  // bounce de "aterrizaje" (animate-drop-land). Se limpia tras 700ms.
  const [recentlyDroppedId, setRecentlyDroppedId] = useState<string | null>(
    null,
  );

  // Sensors separados para mouse y touch porque tienen UX distinta:
  // - Mouse: drag inicia después de 6px de movimiento (rápido, sin delay)
  // - Touch: long-press de 200ms (evita que el touch para scroll de la
  //   grilla se confunda con drag de un card). Con tolerance 5px el
  //   usuario puede mover ligeramente el dedo durante el long-press
  //   sin cancelarlo.
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  // Si focusDate es anterior a hoy, deshabilitamos todo el drag & drop.
  // Mover un turno de un día pasado no tiene sentido (no podés cambiarlo
  // a otra hora de un día que ya terminó). Visualmente se mantiene
  // visible para que el barbero pueda CONSULTAR la agenda pasada.
  const isDayLocked = useMemo(() => {
    return focusDate < getTodayYmd();
  }, [focusDate]);

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

  // 4. Indexar appointments por (barberId, slotDeGrilla) para acceso O(1).
  //    OJO: la hora de arranque de un turno NO siempre cae en la grilla fija
  //    de esta vista. El motor de reservas genera horarios según la DURACIÓN
  //    del servicio (y un "slot de cierre" pegado al fin de jornada), así que
  //    hay turnos fuera de grilla (ej. 16:20 en una grilla de 30'). Si
  //    buscáramos por hora EXACTA, esos turnos no matchearían ninguna fila y
  //    desaparecerían del calendario (seguían visibles solo en la vista Lista).
  //    Solución: encajamos cada turno en la fila que lo CONTIENE (floor al
  //    slot). Si la hora ya cae justo en la grilla, el floor la deja igual
  //    → no-op y cero regresión con cualquier intervalo.
  const appointmentsByBarberAndTime = useMemo(() => {
    const gridStartMin = timeToMinutes(gridStartTime);
    const step = workingHours.intervalMinutes;
    const map = new Map<string, AppointmentRow>();
    for (const appointment of appointments) {
      if (appointment.appointment_date !== focusDate) continue;
      if (
        appointment.status !== "pending" &&
        appointment.status !== "confirmed"
      ) {
        continue;
      }
      const apptMin = timeToMinutes(appointment.appointment_time.slice(0, 5));
      const slotMin =
        step > 0 && apptMin >= gridStartMin
          ? gridStartMin + Math.floor((apptMin - gridStartMin) / step) * step
          : apptMin;
      const key = `${appointment.barber_id}:${minutesToTimeLabel(slotMin)}`;
      // Colisión (2 turnos que caen en la misma fila, solo posible si la
      // duración del servicio < intervalo de grilla): gana el que arranca
      // más temprano — así el que está pegado al borde del slot no queda
      // tapado por uno posterior.
      const existing = map.get(key);
      if (
        !existing ||
        apptMin < timeToMinutes(existing.appointment_time.slice(0, 5))
      ) {
        map.set(key, appointment);
      }
    }
    return map;
  }, [appointments, focusDate, gridStartTime, workingHours.intervalMinutes]);

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
      // Haptic feedback en mobile: vibración corta de 30ms al activar
      // el drag. Confirma sin texto que "agarraste" el card. Algunos
      // browsers/devices no soportan Vibration API → ignoramos silently.
      if (
        typeof navigator !== "undefined" &&
        "vibrate" in navigator &&
        typeof navigator.vibrate === "function"
      ) {
        try {
          navigator.vibrate(30);
        } catch {
          /* noop */
        }
      }
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

    // ─── OPTIMISTIC UPDATE ─────────────────────────────────────────────
    // Movemos el card al lugar nuevo INMEDIATAMENTE en el state local,
    // mientras el endpoint corre en background. Si falla, revertimos.
    // Antes esperábamos la respuesta (~200-500ms) y el card se quedaba
    // en su posición vieja, dando sensación de lag.
    if (!appointment.id) return;
    const apptId = appointment.id;
    const targetBarber = barbers.find((b) => b.id === dropTarget.barberId);
    const optimisticAppointment = {
      id: apptId,
      appointment_date: appointment.appointment_date,
      appointment_time: `${dropTarget.time}:00`,
      barber_id: dropTarget.barberId,
      barber_name:
        targetBarber?.display_name?.trim() ||
        targetBarber?.name ||
        appointment.barber_name,
    };
    onMoveComplete(optimisticAppointment);

    // Bounce inmediato en la nueva posición (sin esperar al server)
    setRecentlyDroppedId(apptId);
    setTimeout(() => {
      setRecentlyDroppedId((current) => (current === apptId ? null : current));
    }, 700);

    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        // Revertir el optimistic update
        onMoveComplete({
          id: apptId,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time,
          barber_id: appointment.barber_id,
          barber_name: appointment.barber_name,
        });
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
        // Revertir el optimistic update al fallar el server
        onMoveComplete({
          id: apptId,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time,
          barber_id: appointment.barber_id,
          barber_name: appointment.barber_name,
        });
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
      // Confirmar con datos del server (puede diff con el optimistic ej.
      // por updated_at o canonicalización de hora).
      onMoveComplete(result.appointment);

      // Haptic feedback de éxito: pattern corto-medio para confirmar drop
      // exitoso (distinto del start). Solo en devices que soporten.
      if (
        typeof navigator !== "undefined" &&
        "vibrate" in navigator &&
        typeof navigator.vibrate === "function"
      ) {
        try {
          navigator.vibrate([20, 40, 20]);
        } catch {
          /* noop */
        }
      }

      // (Bounce ya se disparó al optimistic update, no se repite acá)

      // Abrir el modal para notificar al cliente del cambio.
      // El email automático se dispara solo al montar el modal; el botón
      // de WhatsApp queda disponible para que el admin pueda mandar también.
      setNotifyContext({
        appointmentId: appointment.id ?? "",
        customerName: appointment.customer_name,
        customerPhone: appointment.customer_phone,
        customerEmail: appointment.customer_email ?? null,
        serviceName: appointment.service_name,
        oldDate: appointment.appointment_date,
        oldTime: currentTime,
        newDate: result.appointment.appointment_date,
        newTime: result.appointment.appointment_time.slice(0, 5),
        newBarberName: result.appointment.barber_name,
      });
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
      {/* Banner contextual: día pasado o instrucciones de drag&drop */}
      {isDayLocked ? (
        <div className="mb-3 flex items-start gap-3 rounded-[var(--radius-md)] border border-[color:var(--text-muted)]/30 bg-[color:var(--surface-1)] p-3">
          <CalendarX
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-[color:var(--text-muted)]"
          />
          <div>
            <p className="text-xs font-bold text-white">Día pasado</p>
            <p className="mt-0.5 text-[11px] leading-5 text-[color:var(--text-muted)]">
              Esta es la agenda histórica. No se pueden mover turnos de
              fechas que ya pasaron.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-3 flex items-start gap-3 rounded-[var(--radius-md)] border border-[color:var(--brand-gold)]/20 bg-[color:var(--brand-gold-soft)]/40 p-3">
          <Move
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-gold)]"
          />
          <div>
            <p className="text-xs font-bold text-white">
              Arrastrá los turnos para mover
            </p>
            <p className="mt-0.5 text-[11px] leading-5 text-[color:var(--text-secondary)]">
              <span className="hidden sm:inline">
                Verticalmente: cambiar de hora. Horizontalmente: cambiar de
                barbero. Los slots disponibles se marcan en gold mientras
                arrastrás.
              </span>
              <span className="inline sm:hidden">
                <strong>En mobile</strong>: mantené apretado un turno por
                1 segundo, después arrastralo al nuevo horario o barbero.
              </span>
            </p>
          </div>
        </div>
      )}

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
                      isDayLocked={isDayLocked}
                      isDragActive={Boolean(activeAppointment)}
                    >
                      {appointment ? (
                        <DraggableAppointmentCard
                          appointment={appointment}
                          isLocked={isDayLocked}
                          wasRecentlyDropped={
                            recentlyDroppedId === appointment.id
                          }
                        />
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

      <RescheduleNotifyDialog
        context={notifyContext}
        barbershopSlug={barbershopSlug}
        barbershopName={barbershopName}
        onClose={() => setNotifyContext(null)}
      />
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
