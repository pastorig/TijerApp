"use client";

/**
 * AgendaCalendarGridView
 *
 * Vista tipo "agenda / timeline" del turnero del admin. Rediseño premium
 * (dirección "agenda_pro"):
 *
 *   ┌────────┬──────────────┬──────────────┐
 *   │        │  JEREMÍAS    │  MATEO       │  ← cabecera con avatar + contador
 *   ├────────┼──────────────┼──────────────┤
 *   │ 15:00 ─┼──────────────┼──────────────┤
 *   │        │ ▐ Cliente A  │              │  ← bloque cuya ALTURA = duración
 *   │ 16:00 ─┼──────────────┼─ ▐ Cliente C │
 *   │        │ ▐ Cliente B  │              │
 *   │ ···    │              │              │
 *   └────────┴──────────────┴──────────────┘
 *
 * A diferencia de la grilla vieja (1 card por celda fija), acá cada turno es
 * un BLOQUE posicionado por hora (top) y duración (height) sobre un eje de
 * horas real, así se ven los huecos libres a escala.
 *
 * Preservación del drag & drop (idéntico a la versión previa):
 *  - Detrás de los bloques viven las zonas droppables por slot (una por
 *    intervalo de grilla), registradas con `useDroppable`. La detección de
 *    colisión de dnd-kit es geométrica (rects) → los bloques encima no la
 *    tapan.
 *  - Los turnos son `useDraggable`. Al arrastrar, el card se levanta con
 *    `DragOverlay` dejando las celdas droppables expuestas.
 *  - `handleDragStart` / `handleDragEnd` / `appointmentsByBarberAndTime` /
 *    `isSlotInBarberWorkingHours` / los sensores: sin cambios de lógica.
 *
 * Drag vertical: cambiar hora dentro del mismo barbero.
 * Drag horizontal: cambiar barbero.
 */

import { useEffect, useMemo, useState } from "react";
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
import { CalendarX, Clock, GripVertical, Plus, Scissors } from "lucide-react";
import { useToast } from "@/components/ui";
import { READ_ONLY_REASON, useIsReadOnly } from "./PlanContext";
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

const SLOT_HEIGHT_PX = 60; // Altura visual de un intervalo de grilla
const RULER_WIDTH_PX = 62; // Ancho de la columna de horas (izquierda)
const MIN_COL_WIDTH_PX = 172; // Ancho mínimo de columna de barbero
const MIN_BLOCK_HEIGHT_PX = 48; // Piso de altura para turnos cortos (legibilidad)

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

/** Iniciales (máx 2) a partir de un nombre. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Paleta de acento por estado del turno (color = acento, no relleno). */
type StatusAccent = {
  bar: string; // color de la barra vertical + anillo del avatar
  glow: string; // color del glow radial sutil
  label: string; // etiqueta corta
  labelColor: string; // color del texto de estado
};

function statusAccentOf(status: AppointmentRow["status"]): StatusAccent {
  if (status === "confirmed") {
    return {
      bar: "var(--success)",
      glow: "rgba(110, 231, 183, 0.16)",
      label: "Confirmado",
      labelColor: "var(--success)",
    };
  }
  if (status === "pending") {
    return {
      bar: "var(--brand-gold)",
      glow: "rgba(201, 162, 62, 0.18)",
      label: "Pendiente",
      labelColor: "var(--brand-gold-hi)",
    };
  }
  return {
    bar: "var(--text-subtle)",
    glow: "rgba(138, 138, 138, 0.12)",
    label: "Cancelado",
    labelColor: "var(--text-muted)",
  };
}

/**
 * Bloque de un turno posicionado en el timeline. La geometría (top/height/
 * lane) la calcula el parent; acá solo renderizamos y cableamos el drag.
 *
 * `isOverlay` = copia que sigue al cursor durante el drag (DragOverlay).
 * `isLocked` = día pasado (no draggable, se ve "archivado").
 * `isInProgress` = turno en curso ahora (glow + pill "EN CURSO").
 */
function DraggableAppointmentBlock({
  appointment,
  geometry,
  isOverlay = false,
  isLocked = false,
  isInProgress = false,
  wasRecentlyDropped = false,
}: {
  appointment: AppointmentRow;
  geometry?: { top: number; height: number; left: number; width: number };
  isOverlay?: boolean;
  isLocked?: boolean;
  isInProgress?: boolean;
  wasRecentlyDropped?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `appt:${appointment.id}`,
    data: { appointment },
    disabled: isLocked,
  });

  const accent = statusAccentOf(appointment.status);
  const startMin = timeToMinutes(appointment.appointment_time.slice(0, 5));
  const duration = appointment.service_duration_minutes || 0;
  const endLabel = minutesToTimeLabel(startMin + duration);

  // Bloques muy chatos ocultan info → si la altura es baja mostramos una
  // versión condensada (solo nombre + hora en una línea).
  const compact = !isOverlay && geometry ? geometry.height < 64 : false;

  const positionStyle: React.CSSProperties = isOverlay
    ? { width: 208 }
    : geometry
      ? {
          position: "absolute",
          top: geometry.top,
          height: Math.max(geometry.height, MIN_BLOCK_HEIGHT_PX),
          left: `calc(${geometry.left}% + 4px)`,
          width: `calc(${geometry.width}% - 8px)`,
        }
      : {};

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={positionStyle}
      className={cn(
        "group z-10 overflow-hidden rounded-[var(--radius-md)] border text-left",
        "border-[color:var(--border-default)] bg-[color:var(--surface-2)]",
        "shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_10px_26px_-16px_rgba(0,0,0,0.9)]",
        "transition-[transform,box-shadow,opacity] duration-150",
        !isLocked && "touch-none select-none",
        isLocked
          ? "cursor-not-allowed opacity-60 [filter:saturate(0.55)]"
          : "cursor-grab hover:z-20 hover:shadow-elevated hover:-translate-y-px active:cursor-grabbing",
        // Bloque en su sitio mientras se arrastra la copia (overlay): se apaga.
        isDragging && !isOverlay && "opacity-25 [filter:blur(0.5px)]",
        // Copia levantada que sigue al cursor.
        isOverlay &&
          "rotate-[-1.2deg] scale-[1.03] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85),0_0_30px_-6px_color-mix(in_oklab,var(--brand-gold)_45%,transparent)] ring-2 ring-[color:var(--brand-gold)]",
        // Turno en curso: anillo + glow dorado permanente.
        isInProgress &&
          !isOverlay &&
          "ring-1 ring-[color:var(--brand-gold)]/70 shadow-[0_0_0_1px_var(--brand-gold-ring),0_0_28px_-10px_rgba(201,162,62,0.5)]",
        // Bounce de aterrizaje tras mover.
        wasRecentlyDropped && !isOverlay && "animate-drop-land",
      )}
    >
      {/* Barra vertical de acento (estado) */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: accent.bar }}
      />
      {/* Glow radial sutil del color de estado (arriba-izquierda) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at 0% 0%, ${accent.glow} 0%, transparent 60%)`,
        }}
      />
      {/* Brillo sutil superior (glass) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10"
      />

      <div className="relative flex h-full items-stretch gap-2 pl-3 pr-2 py-1.5">
        {/* Avatar del cliente con anillo del color de estado */}
        {!compact && (
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center self-start rounded-full border text-[10px] font-black uppercase tracking-tight text-white"
            style={{
              borderColor: accent.bar,
              background: "var(--surface-3)",
              boxShadow: `0 0 12px -6px ${accent.bar}`,
            }}
          >
            {initialsOf(appointment.customer_name)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <p className="truncate text-[12px] font-bold leading-tight text-white">
              {appointment.customer_name}
            </p>
            {!compact && (
              <span className="shrink-0 whitespace-nowrap font-mono text-[9px] leading-tight text-[color:var(--text-muted)]">
                {duration}min
              </span>
            )}
          </div>

          {compact ? (
            <p className="mt-0.5 truncate font-mono text-[9px] leading-tight text-[color:var(--text-muted)]">
              {appointment.appointment_time.slice(0, 5)} · {appointment.service_name}
            </p>
          ) : (
            <>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] leading-tight text-[color:var(--text-secondary)]">
                <Scissors
                  aria-hidden="true"
                  className="size-2.5 shrink-0 text-[color:var(--text-muted)]"
                />
                <span className="truncate">{appointment.service_name}</span>
              </p>
              <div className="mt-1 flex items-center justify-between gap-1.5">
                <span className="font-mono text-[10px] font-semibold text-[color:var(--text-secondary)]">
                  {appointment.appointment_time.slice(0, 5)}–{endLabel}
                </span>
                {isInProgress ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-grad px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-black">
                    <span className="size-1 rounded-full bg-black/70" />
                    En curso
                  </span>
                ) : (
                  <span
                    className="text-[9px] font-bold uppercase tracking-[0.1em]"
                    style={{ color: accent.labelColor }}
                  >
                    {accent.label}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Grip visible al hover */}
        {!isLocked && !isOverlay && (
          <GripVertical
            aria-hidden="true"
            className="absolute right-1 top-1 size-3 text-[color:var(--brand-gold)] opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Slot droppable (capa de fondo). Ya NO contiene el card — es solo la zona
 * donde se puede soltar. Mantiene el registro `useDroppable` para que el
 * drag & drop siga funcionando idéntico.
 *
 * Visual states:
 *  - fuera de horario: hatching diagonal (no drop)
 *  - vacío + drag activo + over: pulse gold (drop target)
 *  - vacío + drag activo: ring gold tenue
 *  - vacío + hover sin drag: afordancia "+ turno"
 */
function DroppableSlot({
  barberId,
  time,
  top,
  isHourStart,
  isInWorkingHours,
  isOccupied,
  isDayLocked,
  isDragActive,
}: {
  barberId: string;
  time: string;
  top: number;
  isHourStart: boolean;
  isInWorkingHours: boolean;
  isOccupied: boolean;
  isDayLocked: boolean;
  isDragActive: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: makeDroppableId(barberId, time),
    disabled: !isInWorkingHours || isOccupied || isDayLocked,
  });

  const isAvailableDropTarget = isInWorkingHours && !isOccupied && !isDayLocked;
  const showDragHint = isAvailableDropTarget && isDragActive;
  const showBusyTooltip = isOccupied && isDragActive && !isDayLocked;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group/slot absolute inset-x-0 border-t transition-colors duration-150",
        isHourStart
          ? "border-[color:var(--border-default)]"
          : "border-[color:var(--border-subtle)]/60",
        !isInWorkingHours &&
          "[background-image:linear-gradient(135deg,transparent_46%,var(--border-subtle)_46%,var(--border-subtle)_54%,transparent_54%)] [background-size:7px_7px]",
        showDragHint &&
          !isOver &&
          "bg-[color:var(--brand-gold-soft)]/25 ring-1 ring-inset ring-[color:var(--brand-gold)]/35",
        isOver &&
          "z-10 bg-[color:var(--brand-gold-soft)] ring-2 ring-inset ring-[color:var(--brand-gold)] animate-drop-target-pulse",
        // Afordancia "+ turno" al hover sobre tiempo libre (sin drag activo).
        isAvailableDropTarget &&
          !isDragActive &&
          "hover:bg-[color:var(--surface-2)]/40",
        showBusyTooltip && "busy-slot-tooltip",
      )}
      style={{ top, height: SLOT_HEIGHT_PX }}
    >
      {isAvailableDropTarget && !isDragActive && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover/slot:opacity-100">
          <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--surface-1)]/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)]">
            <Plus aria-hidden="true" className="size-2.5" />
            Turno
          </span>
        </span>
      )}
    </div>
  );
}

/**
 * Empaqueta los turnos de un barbero en "carriles" (lanes) para que dos
 * turnos que se solapan (ej. una doble reserva) se muestren lado a lado en
 * vez de taparse. Coloreo de grafo de intervalos simple: por cada turno,
 * el primer carril libre; luego se calcula el ancho del cluster.
 */
type BlockGeometry = {
  appointment: AppointmentRow;
  top: number;
  height: number;
  left: number; // %
  width: number; // %
};

function packBarberBlocks(
  appts: AppointmentRow[],
  gridStartMin: number,
  interval: number,
): BlockGeometry[] {
  const pxPerMin = SLOT_HEIGHT_PX / interval;
  const sorted = [...appts].sort(
    (a, b) =>
      timeToMinutes(a.appointment_time.slice(0, 5)) -
      timeToMinutes(b.appointment_time.slice(0, 5)),
  );

  // Asignar lane a cada turno.
  type Placed = {
    appt: AppointmentRow;
    start: number;
    end: number;
    lane: number;
  };
  const placed: Placed[] = [];
  const laneEnds: number[] = []; // fin (min) del último turno de cada lane
  for (const appt of sorted) {
    const start = timeToMinutes(appt.appointment_time.slice(0, 5));
    const end = start + (appt.service_duration_minutes || interval);
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    placed.push({ appt, start, end, lane });
  }

  // Para cada turno, cuántos lanes tiene su cluster de solapamiento.
  return placed.map((p) => {
    const overlapping = placed.filter(
      (q) => q.start < p.end && q.end > p.start,
    );
    const clusterLanes =
      Math.max(...overlapping.map((q) => q.lane)) + 1 || 1;
    const width = 100 / clusterLanes;
    return {
      appointment: p.appt,
      top: (p.start - gridStartMin) * pxPerMin,
      height: (p.end - p.start) * pxPerMin,
      left: p.lane * width,
      width,
    };
  });
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
  const isReadOnly = useIsReadOnly();
  const [activeAppointment, setActiveAppointment] =
    useState<AppointmentRow | null>(null);
  const [notifyContext, setNotifyContext] =
    useState<RescheduleNotifyContext | null>(null);
  // Trackeamos qué appointment recién se movió para animarlo con el
  // bounce de "aterrizaje" (animate-drop-land). Se limpia tras 700ms.
  const [recentlyDroppedId, setRecentlyDroppedId] = useState<string | null>(
    null,
  );

  // Minuto actual del día — para la línea "ahora" y el resalte de "en curso".
  // Se refresca cada 60s para que la línea avance sola sin recargar.
  const [nowMinutes, setNowMinutes] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMinutes(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

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
  // Plan vencido => modo lectura: la agenda queda congelada igual que un día
  // pasado. Reusamos el mismo candado, que ya apaga draggable, droppable y la
  // afordancia "+ turno".
  const isPastDay = useMemo(() => focusDate < getTodayYmd(), [focusDate]);
  const isDayLocked = isPastDay || isReadOnly;

  const isToday = useMemo(() => focusDate === getTodayYmd(), [focusDate]);

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
      .filter(
        (entry): entry is { barber: BarberRow; schedule: BarberDaySchedule } =>
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

  const gridStartMin = timeToMinutes(gridStartTime);
  const gridEndMin = timeToMinutes(gridEndTime);
  const gridHeight = timeSlots.length * SLOT_HEIGHT_PX;

  // 4. Indexar appointments por (barberId, slotDeGrilla) para el chequeo de
  //    OCUPACIÓN de los droppables (impedir soltar sobre un slot ocupado).
  //    OJO: la hora de arranque de un turno NO siempre cae en la grilla fija
  //    de esta vista. El motor de reservas genera horarios según la DURACIÓN
  //    del servicio (y un "slot de cierre" pegado al fin de jornada), así que
  //    hay turnos fuera de grilla (ej. 16:20 en una grilla de 30'). Para la
  //    ocupación encajamos cada turno en la fila que lo CONTIENE (floor al
  //    slot). Si la hora ya cae justo en la grilla, el floor la deja igual.
  const appointmentsByBarberAndTime = useMemo(() => {
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
      // Colisión (2 turnos que caen en la misma fila): gana el que arranca
      // más temprano — así el que está pegado al borde no queda tapado.
      const existing = map.get(key);
      if (
        !existing ||
        apptMin < timeToMinutes(existing.appointment_time.slice(0, 5))
      ) {
        map.set(key, appointment);
      }
    }
    return map;
  }, [
    appointments,
    focusDate,
    gridStartMin,
    workingHours.intervalMinutes,
  ]);

  // 5. Turnos del día por barbero, con geometría de bloque (top/height/lane).
  //    Estos son los BLOQUES visibles del timeline (todos los turnos, no
  //    deduplicados — el lane-packing evita que se tapen si se solapan).
  const blocksByBarber = useMemo(() => {
    const byBarber = new Map<string, AppointmentRow[]>();
    for (const appointment of appointments) {
      if (appointment.appointment_date !== focusDate) continue;
      if (
        appointment.status !== "pending" &&
        appointment.status !== "confirmed"
      ) {
        continue;
      }
      const list = byBarber.get(appointment.barber_id) ?? [];
      list.push(appointment);
      byBarber.set(appointment.barber_id, list);
    }
    const result = new Map<string, BlockGeometry[]>();
    for (const [barberId, list] of byBarber) {
      result.set(
        barberId,
        packBarberBlocks(list, gridStartMin, workingHours.intervalMinutes),
      );
    }
    return result;
  }, [appointments, focusDate, gridStartMin, workingHours.intervalMinutes]);

  // Contador por barbero para la cabecera (total del día + próximo turno).
  const statsByBarber = useMemo(() => {
    const stats = new Map<
      string,
      { total: number; nextTime: string | null }
    >();
    for (const { barber } of activeBarbersWithSchedule) {
      const list = blocksByBarber.get(barber.id) ?? [];
      let nextTime: string | null = null;
      if (isToday) {
        const upcoming = list
          .map((b) => timeToMinutes(b.appointment.appointment_time.slice(0, 5)))
          .filter((m) => m >= nowMinutes)
          .sort((a, b) => a - b);
        if (upcoming.length > 0) nextTime = minutesToTimeLabel(upcoming[0]);
      }
      stats.set(barber.id, { total: list.length, nextTime });
    }
    return stats;
  }, [activeBarbersWithSchedule, blocksByBarber, isToday, nowMinutes]);

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

  // Posición vertical de la línea "ahora" (solo hoy y dentro del rango).
  const showNowLine =
    isToday && nowMinutes >= gridStartMin && nowMinutes <= gridEndMin;
  const nowTop =
    ((nowMinutes - gridStartMin) / workingHours.intervalMinutes) *
    SLOT_HEIGHT_PX;

  // Marcas de la regla izquierda alineadas al INICIO de cada turno. Como los
  // turnos caen según la duración del servicio (ej. cada 40' → 15:40, 16:20…),
  // no coinciden con las horas enteras: sin esto un turno de 17:40 "pisa" la
  // marca de las 18:00 y no se lee a qué hora es. Cada marca se ubica en el
  // borde superior de su bloque (mismo `top`), así la hora queda pegada al turno.
  const blockStartTicks: { min: number; top: number; label: string }[] = [];
  const seenTickMin = new Set<number>();
  for (const list of blocksByBarber.values()) {
    for (const geo of list) {
      const startMin = timeToMinutes(
        geo.appointment.appointment_time.slice(0, 5),
      );
      if (seenTickMin.has(startMin)) continue;
      seenTickMin.add(startMin);
      blockStartTicks.push({
        min: startMin,
        top: geo.top,
        label: minutesToTimeLabel(startMin),
      });
    }
  }
  blockStartTicks.sort((a, b) => a.min - b.min);

  // Horas completas de referencia, pero omitimos las que quedan pegadas a una
  // marca de turno (±18px) para no duplicar/encimar etiquetas.
  const hourLabels: { min: number; top: number; label: string }[] = [];
  for (let m = Math.ceil(gridStartMin / 60) * 60; m <= gridEndMin; m += 60) {
    const top =
      ((m - gridStartMin) / workingHours.intervalMinutes) * SLOT_HEIGHT_PX;
    if (blockStartTicks.some((t) => Math.abs(t.top - top) < 18)) continue;
    hourLabels.push({ min: m, top, label: minutesToTimeLabel(m) });
  }

  const columnsMinWidth =
    RULER_WIDTH_PX + activeBarbersWithSchedule.length * MIN_COL_WIDTH_PX;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Hint slim (pill) — reemplaza el recuadro grande anterior */}
      {isDayLocked ? (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--text-muted)]/30 bg-[color:var(--surface-1)] px-3 py-1.5">
          <CalendarX
            aria-hidden="true"
            className="size-3.5 shrink-0 text-[color:var(--text-muted)]"
          />
          <span className="text-[11px] font-semibold text-[color:var(--text-secondary)]">
            {isReadOnly
              ? READ_ONLY_REASON
              : "Agenda histórica — los turnos de días pasados no se pueden mover."}
          </span>
        </div>
      ) : (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--brand-gold)]/25 bg-[color:var(--brand-gold-soft)]/50 px-3 py-1.5">
          <GripVertical
            aria-hidden="true"
            className="size-3.5 shrink-0 text-[color:var(--brand-gold)]"
          />
          <span className="text-[11px] font-semibold text-[color:var(--text-secondary)]">
            <span className="hidden sm:inline">
              Arrastrá un turno para cambiar hora o barbero.
            </span>
            <span className="inline sm:hidden">
              Mantené apretado un turno y arrastralo para moverlo.
            </span>
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] shadow-card">
        <div style={{ minWidth: columnsMinWidth }}>
          {/* ── Cabecera sticky (arriba): esquina + barberos ── */}
          <div className="sticky top-0 z-30 flex border-b border-[color:var(--border-default)] bg-[color:var(--surface-2)]/95 backdrop-blur-sm">
            <div
              className="sticky left-0 z-10 shrink-0 border-r border-[color:var(--border-subtle)] bg-[color:var(--surface-2)]/95 px-2 py-2.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-subtle)]"
              style={{ width: RULER_WIDTH_PX }}
            >
              Hora
            </div>
            {activeBarbersWithSchedule.map(({ barber, schedule }) => {
              const stats = statsByBarber.get(barber.id);
              const name = barber.display_name?.trim() || barber.name;
              return (
                <div
                  key={`header-${barber.id}`}
                  className="flex flex-1 items-center gap-2 border-r border-[color:var(--border-subtle)] px-2.5 py-2 last:border-r-0"
                  style={{ minWidth: MIN_COL_WIDTH_PX }}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-default)] bg-[color:var(--surface-3)] text-[11px] font-black uppercase tracking-tight text-[color:var(--text-secondary)]"
                  >
                    {initialsOf(name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold leading-tight text-white">
                      {name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[9px] leading-tight text-[color:var(--text-muted)]">
                      <span className="font-semibold text-[color:var(--brand-gold)]">
                        {stats?.total ?? 0} turno{(stats?.total ?? 0) === 1 ? "" : "s"}
                      </span>
                      {stats?.nextTime ? (
                        <span className="font-mono">· próx {stats.nextTime}</span>
                      ) : (
                        <span className="font-mono">
                          {schedule.startTime.slice(0, 5)}–{schedule.endTime.slice(0, 5)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Cuerpo: regla de horas (sticky izq) + columnas de barberos ── */}
          <div className="flex">
            {/* Regla de horas */}
            <div
              className="sticky left-0 z-20 shrink-0 border-r border-[color:var(--border-subtle)] bg-[color:var(--surface-1)]"
              style={{ width: RULER_WIDTH_PX, height: gridHeight }}
            >
              <div className="relative h-full">
                {/* Horas enteras: referencia tenue */}
                {hourLabels.map((h) => (
                  <div
                    key={`hour-${h.min}`}
                    className="absolute right-2 -translate-y-1/2"
                    style={{ top: h.top }}
                  >
                    <span className="font-mono text-[11px] text-[color:var(--text-muted)]">
                      {h.label}
                    </span>
                  </div>
                ))}
                {/* Hora exacta de cada turno, alineada a su bloque */}
                {blockStartTicks.map((t) => (
                  <div
                    key={`tick-${t.min}`}
                    className="absolute right-1.5 flex -translate-y-1/2 items-center gap-1"
                    style={{ top: t.top }}
                  >
                    <span className="font-mono text-[11px] font-bold text-[color:var(--brand-gold)]">
                      {t.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand-gold)]"
                    />
                  </div>
                ))}
                {showNowLine && (
                  <div
                    className="absolute right-1 -translate-y-1/2"
                    style={{ top: nowTop }}
                  >
                    <span className="rounded-sm bg-gold-grad px-1 py-0.5 font-mono text-[9px] font-black text-black">
                      {minutesToTimeLabel(nowMinutes)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Columnas de barberos */}
            {activeBarbersWithSchedule.map(({ barber, schedule }) => {
              const blocks = blocksByBarber.get(barber.id) ?? [];
              return (
                <div
                  key={`col-${barber.id}`}
                  className="relative flex-1 border-r border-[color:var(--border-subtle)] last:border-r-0"
                  style={{ minWidth: MIN_COL_WIDTH_PX, height: gridHeight }}
                >
                  {/* Capa de fondo: slots droppables */}
                  {timeSlots.map((time, i) => {
                    const inWorking = isSlotInBarberWorkingHours(schedule, time);
                    const occupied = appointmentsByBarberAndTime.has(
                      `${barber.id}:${time}`,
                    );
                    return (
                      <DroppableSlot
                        key={`slot-${barber.id}-${time}`}
                        barberId={barber.id}
                        time={time}
                        top={i * SLOT_HEIGHT_PX}
                        isHourStart={time.endsWith(":00")}
                        isInWorkingHours={inWorking}
                        isOccupied={occupied}
                        isDayLocked={isDayLocked}
                        isDragActive={Boolean(activeAppointment)}
                      />
                    );
                  })}

                  {/* Línea "ahora" (solo hoy) */}
                  {showNowLine && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-[15] flex items-center"
                      style={{ top: nowTop }}
                    >
                      <span className="size-1.5 -translate-x-1/2 rounded-full bg-[color:var(--brand-gold)] shadow-[0_0_8px_2px_rgba(201,162,62,0.6)]" />
                      <span className="h-px flex-1 bg-[color:var(--brand-gold)]/70" />
                    </div>
                  )}

                  {/* Bloques de turnos */}
                  {blocks.map((geo) => {
                    const startMin = timeToMinutes(
                      geo.appointment.appointment_time.slice(0, 5),
                    );
                    const endMin =
                      startMin +
                      (geo.appointment.service_duration_minutes ||
                        workingHours.intervalMinutes);
                    const inProgress =
                      isToday &&
                      nowMinutes >= startMin &&
                      nowMinutes < endMin;
                    return (
                      <DraggableAppointmentBlock
                        key={`block-${geo.appointment.id}`}
                        appointment={geo.appointment}
                        geometry={geo}
                        isLocked={isDayLocked}
                        isInProgress={inProgress}
                        wasRecentlyDropped={
                          recentlyDroppedId === geo.appointment.id
                        }
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeAppointment ? (
          <DraggableAppointmentBlock
            appointment={activeAppointment}
            isOverlay
          />
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
