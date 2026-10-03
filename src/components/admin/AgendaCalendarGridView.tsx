"use client";

/**
 * AgendaCalendarGridView — vista Calendario del turnero (spec 031).
 *
 *   ┌────────┬──────────────┬──────────────┐
 *   │        │  JEREMÍAS    │  MATEO       │  ← cabecera (en el celular: chips)
 *   ├────────┼──────────────┼──────────────┤
 *   │ 15:00 ─┼▐ Cliente A ─┐│              │  ← bloque: alto = duración
 *   │        │▐ Cliente B ⚠││▐ Cliente C   │  ← encimados lado a lado
 *   │ 16:00 ─┼──────────────┼──────────────┤
 *   └────────┴──────────────┴──────────────┘
 *
 * Dónde va cada bloque lo decide `layoutDia` (src/lib/agenda-layout.ts), que es
 * puro y tiene tests: grupos de turnos encimados con el mismo ancho, "+N" desde
 * el tercer carril, sobreturnos en una franja angosta, altura mínima sin tapar
 * al siguiente. Acá solo se dibuja y se cablea la interacción.
 *
 * - Escala fija de 2 px por minuto.
 * - En el celular (< 768 px) se ve un barbero por vez a ancho completo; se
 *   cambia con los chips o deslizando de costado.
 * - Tocar un turno abre su detalle (`onOpenAppointment`). Tocar un hueco ofrece
 *   "Turno" o "Sobreturno" (`onCreateAt`).
 * - Arrastrar para reprogramar: igual que antes (mouse a 6 px, dedo con
 *   mantener apretado 200 ms), contra PATCH /api/admin/appointments/move.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { motion, useReducedMotion } from "framer-motion";
import { CalendarX, Clock, GripVertical, Plus, TriangleAlert, Zap } from "lucide-react";
import { useToast } from "@/components/ui";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  PX_POR_MIN,
  franjasNoDisponibles,
  layoutDia,
  rangoDelDia,
  type BloqueDibujado,
  type GrupoDibujado,
} from "@/lib/agenda-layout";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import type {
  AppointmentRow,
  BarberDayOverrideRow,
  BarberRow,
  BarberTimeBlockRow,
  BarberWeeklyScheduleRow,
} from "@/lib/supabase";
import { READ_ONLY_REASON, useIsReadOnly } from "./PlanContext";
import {
  getBarberDaySchedule,
  type BarberDaySchedule,
} from "./agenda-schedule-helpers";
import {
  RescheduleNotifyDialog,
  type RescheduleNotifyContext,
} from "./RescheduleNotifyDialog";
import { AgendaBarberSwitcher } from "./agenda/AgendaBarberSwitcher";
import { AgendaSheet } from "./agenda/AgendaSheet";
import { UnavailableBand } from "./agenda/UnavailableBand";

export type AgendaCreateMode = "turno" | "sobreturno";

type AgendaCalendarGridViewProps = {
  barbershopSlug: string;
  /** Nombre de la barbería para el subject del email y el WhatsApp. */
  barbershopName: string;
  focusDate: string;
  barbers: BarberRow[];
  appointments: AppointmentRow[];
  weeklySchedulesByBarber: Record<string, BarberWeeklyScheduleRow[]>;
  dayOverridesByBarber: Record<string, BarberDayOverrideRow | null>;
  /** Bloqueos activos del día, por barbero. */
  timeBlocksByBarber: Record<string, BarberTimeBlockRow[]>;
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
  /** Tocar un turno: abre su detalle. */
  onOpenAppointment: (appointmentId: string) => void;
  /** Tocar un hueco libre y elegir "Turno" o "Sobreturno". */
  onCreateAt: (args: { barberId: string; time: string; mode: AgendaCreateMode }) => void;
};

const RULER_WIDTH_PX = 58; // Columna de horas (izquierda)
const MIN_COL_WIDTH_PX = 200; // Ancho mínimo de columna de barbero en escritorio
const SWIPE_MIN_PX = 60;
const MOBILE_QUERY = "(max-width: 767px)";

function timeToMinutes(time: string): number {
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

/**
 * Hoy en "YYYY-MM-DD" en la zona horaria del browser. Sirve para trabar el
 * arrastre en días pasados (no hay a dónde mover un turno de hace 2 días).
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

/** Lo que dura el turno según el barbero: la duración real si la ajustó. */
function duracionDibujada(appointment: AppointmentRow, fallback: number): number {
  return appointment.actual_duration_minutes ?? appointment.service_duration_minutes ?? fallback;
}

function isActive(appointment: AppointmentRow) {
  return appointment.status === "pending" || appointment.status === "confirmed";
}

function barberDisplayName(barber: BarberRow) {
  return barber.display_name?.trim() || barber.name;
}

/** ID droppable de un slot: "slot:<barberId>:HH:MM". */
function makeDroppableId(barberId: string, time: string): string {
  return `slot:${barberId}:${time}`;
}

function parseDroppableId(id: string): { barberId: string; time: string } | null {
  const parts = id.split(":");
  if (parts.length !== 4 || parts[0] !== "slot") return null;
  return { barberId: parts[1], time: `${parts[2]}:${parts[3]}` };
}

function statusOf(status: AppointmentRow["status"]) {
  if (status === "confirmed") return { bar: "var(--success)", label: "Confirmado" };
  if (status === "pending") return { bar: "var(--brand-gold)", label: "Pendiente" };
  return { bar: "var(--text-subtle)", label: "Cancelado" };
}

/**
 * Bloque de un turno. La geometría viene de `layoutDia`; acá se dibuja y se
 * cablea el arrastre y el toque.
 *
 * `isOverlay` = copia que sigue al dedo/cursor durante el arrastre.
 * `isLocked` = día pasado o plan vencido (no se arrastra, se abre igual).
 */
function DraggableAppointmentBlock({
  appointment,
  bloque,
  durationMinutes,
  isOverlay = false,
  isLocked = false,
  isInProgress = false,
  wasRecentlyDropped = false,
  onOpen,
}: {
  appointment: AppointmentRow;
  bloque?: BloqueDibujado;
  durationMinutes: number;
  isOverlay?: boolean;
  isLocked?: boolean;
  isInProgress?: boolean;
  wasRecentlyDropped?: boolean;
  onOpen?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `appt:${appointment.id}`,
    data: { appointment },
    disabled: isLocked || isOverlay,
  });

  const status = statusOf(appointment.status);
  const startLabel = appointment.appointment_time.slice(0, 5);
  const endLabel = minutesToTimeLabel(timeToMinutes(startLabel) + durationMinutes);
  const compact = !isOverlay && Boolean(bloque?.compacto);
  const encimado = Boolean(bloque?.encimado);
  const sobreturno = Boolean(bloque?.esSobreturno ?? appointment.is_sobreturno);
  const angosto = Boolean(bloque && bloque.anchoPct < 40);

  const positionStyle: React.CSSProperties = isOverlay
    ? { width: 220 }
    : bloque
      ? {
          position: "absolute",
          top: bloque.topPx + 1,
          height: bloque.altoPx - 2,
          left: `calc(${bloque.izquierdaPct}% + 3px)`,
          width: `calc(${bloque.anchoPct}% - 6px)`,
        }
      : {};

  const etiquetaAccesible = [
    `${startLabel} a ${endLabel}`,
    appointment.customer_name,
    appointment.service_name,
    status.label,
    encimado ? "encimado con otro turno" : null,
    sobreturno ? "sobreturno" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      aria-label={etiquetaAccesible}
      aria-roledescription={isLocked ? "turno" : "turno arrastrable"}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.();
        }
      }}
      style={positionStyle}
      className={cn(
        "group z-10 overflow-hidden rounded-[var(--radius-md)] border text-left outline-none",
        "bg-[color:var(--surface-2)] transition-[transform,box-shadow,opacity] duration-150",
        "focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)]",
        sobreturno
          ? "border-dashed border-[color:var(--brand-gold)]/70"
          : encimado
            ? "border-[color:var(--danger)]/60"
            : "border-[color:var(--border-default)]",
        // `touch-pan-y`: con el dedo sobre un turno la página sigue subiendo y
        // bajando; el arrastre arranca recién con mantener apretado 200 ms.
        // (`touch-none` trababa la página; `touch-manipulation` habilitaba el
        // eje horizontal y se corría el calendario en vez de bajar.)
        "touch-pan-y select-none",
        isLocked ? "cursor-pointer" : "cursor-pointer hover:z-20 hover:shadow-elevated active:cursor-grabbing",
        isDragging && !isOverlay && "opacity-25",
        isOverlay &&
          "rotate-[-1deg] scale-[1.03] shadow-elevated ring-2 ring-[color:var(--brand-gold)]",
        isInProgress && !isOverlay && "ring-1 ring-[color:var(--brand-gold)]/70",
        wasRecentlyDropped && !isOverlay && "animate-drop-land",
      )}
    >
      {/* Barra de estado: verde confirmado, dorado pendiente. */}
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ background: status.bar }} />

      {compact ? (
        <div className="flex h-full items-center gap-1.5 pl-2.5 pr-1.5">
          <span className="shrink-0 font-mono text-xs font-semibold text-[color:var(--text-secondary)]">
            {startLabel}
          </span>
          {!angosto ? (
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white">
              {appointment.customer_name}
            </span>
          ) : null}
          <BlockFlags encimado={encimado} sobreturno={sobreturno} />
        </div>
      ) : (
        <div className="flex h-full flex-col gap-0.5 py-1.5 pl-3 pr-2">
          <div className="flex items-start gap-1.5">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-white">
              {appointment.customer_name}
            </p>
            <BlockFlags encimado={encimado} sobreturno={sobreturno} />
          </div>
          {!angosto ? (
            <p className="truncate text-xs leading-tight text-[color:var(--text-secondary)]">
              {sobreturno ? "Sobreturno · " : ""}
              {appointment.service_name} · {durationMinutes} min
            </p>
          ) : null}
          <p className="mt-auto flex items-center justify-between gap-1.5 text-xs leading-tight">
            <span className="font-mono font-semibold text-[color:var(--text-secondary)]">
              {startLabel}–{endLabel}
            </span>
            {!angosto ? (
              isInProgress ? (
                <span className="font-semibold text-[color:var(--brand-gold-hi)]">En curso</span>
              ) : (
                <span className="text-[color:var(--text-muted)]">{status.label}</span>
              )
            ) : null}
          </p>
        </div>
      )}

      {!isLocked && !isOverlay ? (
        <GripVertical
          aria-hidden="true"
          className="absolute bottom-1 right-1 hidden size-3 text-[color:var(--brand-gold)] opacity-0 transition-opacity group-hover:opacity-100 sm:block"
        />
      ) : null}
    </div>
  );
}

function BlockFlags({ encimado, sobreturno }: { encimado: boolean; sobreturno: boolean }) {
  if (!encimado && !sobreturno) return null;
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {encimado ? (
        <TriangleAlert aria-hidden="true" className="size-3.5 text-[color:var(--danger)]" />
      ) : null}
      {sobreturno ? (
        <Zap aria-hidden="true" className="size-3.5 fill-current text-[color:var(--brand-gold)]" />
      ) : null}
    </span>
  );
}

/**
 * Slot de fondo: zona donde se puede soltar un turno y, si está libre, tocar
 * para cargar uno. No contiene al bloque (los bloques van encima).
 */
function DroppableSlot({
  barberId,
  time,
  top,
  height,
  isHourStart,
  isInWorkingHours,
  isOccupied,
  isDayLocked,
  isDragActive,
  onPick,
}: {
  barberId: string;
  time: string;
  top: number;
  height: number;
  isHourStart: boolean;
  isInWorkingHours: boolean;
  isOccupied: boolean;
  isDayLocked: boolean;
  isDragActive: boolean;
  onPick: (barberId: string, time: string, top: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: makeDroppableId(barberId, time),
    disabled: !isInWorkingHours || isOccupied || isDayLocked,
  });

  const isAvailable = isInWorkingHours && !isOccupied && !isDayLocked;
  const showDragHint = isAvailable && isDragActive;
  const showBusyTooltip = isOccupied && isDragActive && !isDayLocked;

  return (
    <div
      ref={setNodeRef}
      onClick={isAvailable && !isDragActive ? () => onPick(barberId, time, top) : undefined}
      className={cn(
        "group/slot absolute inset-x-0 border-t transition-colors duration-150",
        isHourStart ? "border-[color:var(--border-default)]" : "border-[color:var(--border-subtle)]/50",
        isAvailable && !isDragActive && "cursor-pointer hover:bg-[color:var(--surface-2)]/50",
        showDragHint && !isOver && "bg-[color:var(--brand-gold-soft)]/25",
        isOver &&
          "z-[5] bg-[color:var(--brand-gold-soft)] ring-2 ring-inset ring-[color:var(--brand-gold)] animate-drop-target-pulse",
        showBusyTooltip && "busy-slot-tooltip",
      )}
      style={{ top, height }}
    >
      {isAvailable && !isDragActive && height >= 24 ? (
        <span className="pointer-events-none absolute inset-0 hidden items-center justify-center opacity-0 transition-opacity duration-150 group-hover/slot:opacity-100 sm:flex">
          <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--surface-1)]/90 px-2 py-0.5 text-xs font-semibold text-[color:var(--brand-gold)]">
            <Plus aria-hidden="true" className="size-3" />
            {time}
          </span>
        </span>
      ) : null}
    </div>
  );
}

/** Mini menú que aparece al tocar un hueco: "Turno" o "Sobreturno". */
function SlotMenu({
  time,
  top,
  onChoose,
  onClose,
}: {
  time: string;
  top: number;
  onChoose: (mode: AgendaCreateMode) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function handlePointer(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    // En el próximo tick: el mismo toque que abrió el menú no lo cierra.
    const id = setTimeout(() => document.addEventListener("pointerdown", handlePointer), 0);
    document.addEventListener("keydown", handleKey);
    return () => {
      clearTimeout(id);
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Cargar a las ${time}`}
      className="absolute left-2 right-2 z-40 flex flex-col gap-1 rounded-[var(--radius-md)] border border-[color:var(--border-strong)] bg-[color:var(--surface-1)] p-1.5 shadow-elevated animate-scale-in sm:right-auto sm:w-52"
      style={{ top }}
    >
      <p className="px-2 pb-1 pt-0.5 font-mono text-xs text-[color:var(--text-muted)]">{time}</p>
      <button
        type="button"
        role="menuitem"
        onClick={() => onChoose("turno")}
        className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-2.5 text-sm font-semibold text-white hover:bg-[color:var(--surface-2)]"
      >
        <Plus aria-hidden="true" className="size-4 text-[color:var(--brand-gold)]" />
        Turno
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => onChoose("sobreturno")}
        className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-2.5 text-sm font-semibold text-white hover:bg-[color:var(--surface-2)]"
      >
        <Zap aria-hidden="true" className="size-4 fill-current text-[color:var(--brand-gold)]" />
        Sobreturno
      </button>
    </div>
  );
}

type Column = {
  barber: BarberRow;
  schedule: BarberDaySchedule;
  isOffDay: boolean;
};

export function AgendaCalendarGridView({
  barbershopSlug,
  barbershopName,
  focusDate,
  barbers,
  appointments,
  weeklySchedulesByBarber,
  dayOverridesByBarber,
  timeBlocksByBarber,
  workingHours,
  onMoveComplete,
  onOpenAppointment,
  onCreateAt,
}: AgendaCalendarGridViewProps) {
  const toast = useToast();
  const isReadOnly = useIsReadOnly();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const reduceMotion = useReducedMotion();
  const [activeAppointment, setActiveAppointment] = useState<AppointmentRow | null>(null);
  const [notifyContext, setNotifyContext] = useState<RescheduleNotifyContext | null>(null);
  const [recentlyDroppedId, setRecentlyDroppedId] = useState<string | null>(null);
  const [slotMenu, setSlotMenu] = useState<{ barberId: string; time: string; top: number } | null>(null);
  const [openGroup, setOpenGroup] = useState<{ barberId: string; ids: string[] } | null>(null);
  // Un click llega justo después de soltar un arrastre: no tiene que abrir el detalle.
  const justDraggedRef = useRef(false);

  // Minuto actual — línea de "ahora" y "en curso". Se refresca cada 60 s.
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

  // Mouse: arrastre después de 6 px. Dedo: mantener apretado 200 ms (con 5 px
  // de tolerancia) para no confundirlo con scrollear la página.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // Día pasado o plan vencido: se ve todo, no se mueve ni se carga nada.
  const isPastDay = useMemo(() => focusDate < getTodayYmd(), [focusDate]);
  const isDayLocked = isPastDay || isReadOnly;
  const isToday = useMemo(() => focusDate === getTodayYmd(), [focusDate]);
  const interval = workingHours.intervalMinutes > 0 ? workingHours.intervalMinutes : 30;

  const dayAppointments = useMemo(
    () => appointments.filter((a) => a.appointment_date === focusDate && isActive(a)),
    [appointments, focusDate],
  );
  const appointmentById = useMemo(() => {
    const map = new Map<string, AppointmentRow>();
    for (const a of dayAppointments) if (a.id) map.set(a.id, a);
    return map;
  }, [dayAppointments]);

  // Rango que ocupan los turnos de cada barbero (para el barbero de franco
  // con turnos cargados, que igual necesita su columna).
  const dayApptSpanByBarber = useMemo(() => {
    const span = new Map<string, { startMin: number; endMin: number }>();
    for (const appointment of dayAppointments) {
      const start = timeToMinutes(appointment.appointment_time.slice(0, 5));
      const end = start + duracionDibujada(appointment, interval);
      const current = span.get(appointment.barber_id);
      span.set(appointment.barber_id, {
        startMin: Math.min(current?.startMin ?? start, start),
        endMin: Math.max(current?.endMin ?? end, end),
      });
    }
    return span;
  }, [dayAppointments, interval]);

  // Columnas del día: los barberos que trabajan hoy MÁS los que no trabajan
  // pero tienen turnos cargados (si no, esos turnos "se pierden" del calendario).
  const columns = useMemo<Column[]>(() => {
    return barbers
      .map((barber): Column | null => {
        const schedule = getBarberDaySchedule({
          barberId: barber.id,
          date: focusDate,
          weeklySchedulesByBarber,
          dayOverridesByBarber,
          workingHours,
          focusDate,
        });
        if (schedule?.isWorking) return { barber, schedule, isOffDay: false };
        const span = dayApptSpanByBarber.get(barber.id);
        if (!span) return null;
        return {
          barber,
          schedule: {
            startTime: minutesToTimeLabel(span.startMin),
            endTime: minutesToTimeLabel(span.endMin),
            isWorking: false,
            pausa: null,
          },
          isOffDay: true,
        };
      })
      .filter((entry): entry is Column => entry !== null);
  }, [barbers, focusDate, weeklySchedulesByBarber, dayOverridesByBarber, workingHours, dayApptSpanByBarber]);

  // Rango de la regla: jornadas ∪ turnos del día, en horas enteras. Un turno
  // fuera de horario estira la regla en vez de quedar cortado.
  const rango = useMemo(() => {
    return rangoDelDia(
      columns
        .filter((c) => !c.isOffDay)
        .map((c) => ({
          inicioMin: timeToMinutes(c.schedule.startTime),
          finMin: timeToMinutes(c.schedule.endTime),
        })),
      dayAppointments.map((a) => {
        const inicioMin = timeToMinutes(a.appointment_time.slice(0, 5));
        return { inicioMin, finMin: inicioMin + duracionDibujada(a, interval) };
      }),
      { inicioMin: timeToMinutes(workingHours.start), finMin: timeToMinutes(workingHours.end) },
    );
  }, [columns, dayAppointments, interval, workingHours.start, workingHours.end]);

  const gridHeight = (rango.finMin - rango.inicioMin) * PX_POR_MIN;
  const slotHeight = interval * PX_POR_MIN;
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let t = rango.inicioMin; t < rango.finMin; t += interval) slots.push(minutesToTimeLabel(t));
    return slots;
  }, [rango, interval]);

  // Ocupación de los slots droppables: cada turno marca la fila que contiene
  // su inicio (la hora de un turno no siempre cae justo en la grilla).
  const occupiedSlots = useMemo(() => {
    const set = new Set<string>();
    for (const appointment of dayAppointments) {
      const apptMin = timeToMinutes(appointment.appointment_time.slice(0, 5));
      const slotMin =
        apptMin >= rango.inicioMin
          ? rango.inicioMin + Math.floor((apptMin - rango.inicioMin) / interval) * interval
          : apptMin;
      set.add(`${appointment.barber_id}:${minutesToTimeLabel(slotMin)}`);
    }
    return set;
  }, [dayAppointments, rango.inicioMin, interval]);

  // Reparto de los bloques por barbero.
  const layoutByBarber = useMemo(() => {
    const byBarber = new Map<string, AppointmentRow[]>();
    for (const appointment of dayAppointments) {
      const list = byBarber.get(appointment.barber_id) ?? [];
      list.push(appointment);
      byBarber.set(appointment.barber_id, list);
    }
    const result = new Map<string, { bloques: BloqueDibujado[]; grupos: GrupoDibujado[] }>();
    for (const [barberId, list] of byBarber) {
      result.set(
        barberId,
        layoutDia(
          list
            .filter((a) => a.id)
            .map((a) => ({
              id: a.id as string,
              inicioMin: timeToMinutes(a.appointment_time.slice(0, 5)),
              duracionMin: duracionDibujada(a, interval),
              esSobreturno: Boolean(a.is_sobreturno),
            })),
          rango.inicioMin,
        ),
      );
    }
    return result;
  }, [dayAppointments, interval, rango.inicioMin]);

  const franjasByBarber = useMemo(() => {
    const map = new Map<string, ReturnType<typeof franjasNoDisponibles>>();
    for (const { barber, schedule, isOffDay } of columns) {
      map.set(
        barber.id,
        franjasNoDisponibles(
          isOffDay
            ? null
            : {
                trabaja: schedule.isWorking,
                inicioMin: timeToMinutes(schedule.startTime),
                finMin: timeToMinutes(schedule.endTime),
                pausa: schedule.pausa
                  ? {
                      inicioMin: timeToMinutes(schedule.pausa.startTime),
                      finMin: timeToMinutes(schedule.pausa.endTime),
                    }
                  : null,
              },
          (timeBlocksByBarber[barber.id] ?? []).map((b) => ({
            inicioMin: timeToMinutes(b.start_time.slice(0, 5)),
            finMin: timeToMinutes(b.end_time.slice(0, 5)),
            etiqueta: b.reason,
          })),
          rango,
        ),
      );
    }
    return map;
  }, [columns, timeBlocksByBarber, rango]);

  const statsByBarber = useMemo(() => {
    const stats = new Map<string, { total: number; nextTime: string | null }>();
    for (const { barber } of columns) {
      const list = dayAppointments.filter((a) => a.barber_id === barber.id);
      let nextTime: string | null = null;
      if (isToday) {
        const upcoming = list
          .map((a) => timeToMinutes(a.appointment_time.slice(0, 5)))
          .filter((m) => m >= nowMinutes)
          .sort((a, b) => a - b);
        if (upcoming.length > 0) nextTime = minutesToTimeLabel(upcoming[0]);
      }
      stats.set(barber.id, { total: list.length, nextTime });
    }
    return stats;
  }, [columns, dayAppointments, isToday, nowMinutes]);

  // ── Celular: un barbero por pantalla ──────────────────────────────────────
  const storageKey = `tijerapp:agenda:barbero:${barbershopSlug}`;
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(() => {
    try {
      return typeof window === "undefined" ? null : window.sessionStorage.getItem(storageKey);
    } catch {
      return null;
    }
  });
  const [slideDirection, setSlideDirection] = useState(0);

  // Si el guardado no está entre las columnas del día, se elige el que tiene
  // el próximo turno; si no, el primero con turnos; si no, el primero.
  const effectiveSelectedId = useMemo(() => {
    if (selectedBarberId && columns.some((c) => c.barber.id === selectedBarberId)) {
      return selectedBarberId;
    }
    const conProximo = columns
      .map((c) => ({ id: c.barber.id, next: statsByBarber.get(c.barber.id)?.nextTime }))
      .filter((c) => c.next)
      .sort((a, b) => (a.next as string).localeCompare(b.next as string))[0];
    if (conProximo) return conProximo.id;
    const conTurnos = columns.find((c) => (statsByBarber.get(c.barber.id)?.total ?? 0) > 0);
    return conTurnos?.barber.id ?? columns[0]?.barber.id ?? null;
  }, [selectedBarberId, columns, statsByBarber]);

  const selectBarber = useCallback(
    (barberId: string) => {
      const from = columns.findIndex((c) => c.barber.id === effectiveSelectedId);
      const to = columns.findIndex((c) => c.barber.id === barberId);
      setSlideDirection(to > from ? 1 : -1);
      setSelectedBarberId(barberId);
      setSlotMenu(null);
      try {
        window.sessionStorage.setItem(storageKey, barberId);
      } catch {
        /* sin storage (modo privado): no se recuerda, no pasa nada */
      }
    },
    [columns, effectiveSelectedId, storageKey],
  );

  const visibleColumns = isMobile
    ? columns.filter((c) => c.barber.id === effectiveSelectedId)
    : columns;

  // Deslizar de costado sobre el calendario cambia de barbero. Solo si el gesto
  // es claramente horizontal y no hay un arrastre de turno en curso.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  function handleTouchStart(event: React.TouchEvent) {
    if (!isMobile || columns.length < 2) return;
    const t = event.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }
  function handleTouchEnd(event: React.TouchEvent) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || activeAppointment || justDraggedRef.current) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const index = columns.findIndex((c) => c.barber.id === effectiveSelectedId);
    const next = columns[index + (dx < 0 ? 1 : -1)];
    if (next) selectBarber(next.barber.id);
  }

  // Al abrir HOY, la página baja hasta la línea de "ahora" (una vez por día).
  const nowLineRef = useRef<HTMLDivElement>(null);
  const scrolledForDateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isToday || scrolledForDateRef.current === focusDate) return;
    scrolledForDateRef.current = focusDate;
    const frame = requestAnimationFrame(() => {
      nowLineRef.current?.scrollIntoView({
        block: "center",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [isToday, focusDate, reduceMotion]);

  function handleOpen(appointmentId: string | undefined) {
    if (!appointmentId || justDraggedRef.current) return;
    onOpenAppointment(appointmentId);
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { appointment?: AppointmentRow } | undefined;
    if (data?.appointment) {
      setActiveAppointment(data.appointment);
      setSlotMenu(null);
      // Vibración corta al "agarrar" el turno (si el dispositivo la soporta).
      try {
        navigator.vibrate?.(30);
      } catch {
        /* noop */
      }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveAppointment(null);
    justDraggedRef.current = true;
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 300);
    const { active, over } = event;
    if (!over) return;

    const data = active.data.current as { appointment?: AppointmentRow } | undefined;
    if (!data?.appointment) return;
    const appointment = data.appointment;

    const dropTarget = parseDroppableId(String(over.id));
    if (!dropTarget) return;

    const currentTime = appointment.appointment_time.slice(0, 5);
    if (dropTarget.barberId === appointment.barber_id && dropTarget.time === currentTime) return;

    // Optimistic update: el turno se mueve ya; si el servidor falla, vuelve.
    if (!appointment.id) return;
    const apptId = appointment.id;
    const targetBarber = barbers.find((b) => b.id === dropTarget.barberId);
    const revert = () =>
      onMoveComplete({
        id: apptId,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        barber_id: appointment.barber_id,
        barber_name: appointment.barber_name,
      });
    onMoveComplete({
      id: apptId,
      appointment_date: appointment.appointment_date,
      appointment_time: `${dropTarget.time}:00`,
      barber_id: dropTarget.barberId,
      barber_name: (targetBarber && barberDisplayName(targetBarber)) || appointment.barber_name,
    });

    setRecentlyDroppedId(apptId);
    setTimeout(() => setRecentlyDroppedId((current) => (current === apptId ? null : current)), 700);

    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        revert();
        toast.error("Tu sesión expiró, volvé a iniciar sesión.");
        return;
      }

      const res = await fetch("/api/admin/appointments/move", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          appointmentId: appointment.id,
          barbershopSlug,
          newTime: dropTarget.time,
          newBarberId: dropTarget.barberId,
        }),
      });

      if (!res.ok) {
        revert();
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("No pudimos mover el turno", { description: err.error ?? `HTTP ${res.status}` });
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
      if (result.changed === false || !result.appointment) return;

      toast.success("Turno movido", { description: `${appointment.customer_name} → ${dropTarget.time}` });
      onMoveComplete(result.appointment);
      try {
        navigator.vibrate?.([20, 40, 20]);
      } catch {
        /* noop */
      }

      // Aviso al cliente: el email sale al montar el diálogo; WhatsApp queda a mano.
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
      revert();
      toast.error("No pudimos mover el turno", {
        description: err instanceof Error ? err.message : "Probá de nuevo en un momento.",
      });
    }
  }

  const closeSlotMenu = useCallback(() => setSlotMenu(null), []);

  if (columns.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-8 text-center">
        <Clock aria-hidden="true" className="mx-auto size-8 text-[color:var(--text-muted)]" />
        <p className="mt-3 text-sm font-semibold text-white">Ningún barbero trabaja este día</p>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
          Si hay una excepción de horario, cargala desde Barberos.
        </p>
      </div>
    );
  }

  const showNowLine = isToday && nowMinutes >= rango.inicioMin && nowMinutes <= rango.finMin;
  const nowTop = (nowMinutes - rango.inicioMin) * PX_POR_MIN;

  // Regla: la hora de inicio de cada turno visible, alineada a su bloque, más
  // las horas enteras que no queden pegadas a una de esas marcas.
  const blockStartTicks: { min: number; top: number; label: string }[] = [];
  const seenTickMin = new Set<number>();
  for (const { barber } of visibleColumns) {
    for (const bloque of layoutByBarber.get(barber.id)?.bloques ?? []) {
      if (bloque.oculto) continue;
      const appt = appointmentById.get(bloque.id);
      if (!appt) continue;
      const startMin = timeToMinutes(appt.appointment_time.slice(0, 5));
      if (seenTickMin.has(startMin)) continue;
      seenTickMin.add(startMin);
      blockStartTicks.push({ min: startMin, top: bloque.topPx, label: minutesToTimeLabel(startMin) });
    }
  }
  blockStartTicks.sort((a, b) => a.min - b.min);
  const hourLabels: { min: number; top: number; label: string }[] = [];
  for (let m = rango.inicioMin; m <= rango.finMin; m += 60) {
    const top = (m - rango.inicioMin) * PX_POR_MIN;
    if (blockStartTicks.some((t) => Math.abs(t.top - top) < 18)) continue;
    hourLabels.push({ min: m, top, label: minutesToTimeLabel(m) });
  }

  const selectedColumn = columns.find((c) => c.barber.id === effectiveSelectedId);
  const selectedStats = selectedColumn ? statsByBarber.get(selectedColumn.barber.id) : undefined;
  const columnsMinWidth = isMobile ? undefined : RULER_WIDTH_PX + columns.length * MIN_COL_WIDTH_PX;
  const groupAppointments = openGroup
    ? openGroup.ids.map((id) => appointmentById.get(id)).filter((a): a is AppointmentRow => Boolean(a))
    : [];

  const body = (
    <div className="flex">
      {/* Regla de horas */}
      <div
        className="sticky left-0 z-20 shrink-0 border-r border-[color:var(--border-subtle)] bg-[color:var(--surface-1)]"
        style={{ width: RULER_WIDTH_PX, height: gridHeight }}
      >
        <div className="relative h-full">
          {hourLabels.map((h) => (
            <span
              key={`hour-${h.min}`}
              className="absolute right-2 -translate-y-1/2 font-mono text-xs text-[color:var(--text-muted)]"
              style={{ top: Math.max(h.top, 8) }}
            >
              {h.label}
            </span>
          ))}
          {blockStartTicks.map((t) => (
            <span
              key={`tick-${t.min}`}
              className="absolute right-2 -translate-y-1/2 font-mono text-xs font-semibold text-[color:var(--brand-gold)]"
              style={{ top: Math.max(t.top, 8) }}
            >
              {t.label}
            </span>
          ))}
          {showNowLine ? (
            <span
              className="absolute right-1 z-10 -translate-y-1/2 rounded-[var(--radius-xs)] bg-[color:var(--brand-gold)] px-1 font-mono text-xs font-bold text-black"
              style={{ top: nowTop }}
            >
              {minutesToTimeLabel(nowMinutes)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Columnas de barberos */}
      {visibleColumns.map(({ barber, schedule }) => {
        const layout = layoutByBarber.get(barber.id) ?? { bloques: [], grupos: [] };
        const franjas = franjasByBarber.get(barber.id) ?? [];
        const scheduleStart = timeToMinutes(schedule.startTime);
        const scheduleEnd = timeToMinutes(schedule.endTime);
        return (
          <div
            key={`col-${barber.id}`}
            className="relative flex-1 border-r border-[color:var(--border-subtle)] last:border-r-0"
            style={{ minWidth: isMobile ? undefined : MIN_COL_WIDTH_PX, height: gridHeight }}
          >
            {franjas.map((franja) => (
              <UnavailableBand
                key={`band-${franja.tipo}-${franja.inicioMin}`}
                franja={franja}
                topPx={(franja.inicioMin - rango.inicioMin) * PX_POR_MIN}
                altoPx={(franja.finMin - franja.inicioMin) * PX_POR_MIN}
              />
            ))}

            {timeSlots.map((time, i) => {
              const slotMin = timeToMinutes(time);
              return (
                <DroppableSlot
                  key={`slot-${barber.id}-${time}`}
                  barberId={barber.id}
                  time={time}
                  top={i * slotHeight}
                  height={slotHeight}
                  isHourStart={time.endsWith(":00")}
                  isInWorkingHours={slotMin >= scheduleStart && slotMin < scheduleEnd}
                  isOccupied={occupiedSlots.has(`${barber.id}:${time}`)}
                  isDayLocked={isDayLocked}
                  isDragActive={Boolean(activeAppointment)}
                  onPick={(barberId, t, top) => setSlotMenu({ barberId, time: t, top })}
                />
              );
            })}

            {showNowLine ? (
              <div
                ref={visibleColumns[0]?.barber.id === barber.id ? nowLineRef : undefined}
                className="pointer-events-none absolute inset-x-0 z-[15] flex items-center"
                style={{ top: nowTop }}
              >
                <span className="size-2 -translate-x-1/2 rounded-full bg-[color:var(--brand-gold)]" />
                <span className="h-px flex-1 bg-[color:var(--brand-gold)]" />
              </div>
            ) : null}

            {layout.bloques
              .filter((bloque) => !bloque.oculto)
              .map((bloque) => {
                const appointment = appointmentById.get(bloque.id);
                if (!appointment) return null;
                const startMin = timeToMinutes(appointment.appointment_time.slice(0, 5));
                const duration = duracionDibujada(appointment, interval);
                return (
                  <DraggableAppointmentBlock
                    key={`block-${bloque.id}`}
                    appointment={appointment}
                    bloque={bloque}
                    durationMinutes={duration}
                    isLocked={isDayLocked}
                    isInProgress={isToday && nowMinutes >= startMin && nowMinutes < startMin + duration}
                    wasRecentlyDropped={recentlyDroppedId === bloque.id}
                    onOpen={() => handleOpen(appointment.id)}
                  />
                );
              })}

            {/* "+N": turnos de un grupo que no entran en dos carriles. */}
            {layout.grupos
              .filter((grupo) => grupo.ocultos.length > 0)
              .map((grupo) => (
                <button
                  key={`more-${grupo.id}`}
                  type="button"
                  onClick={() => setOpenGroup({ barberId: barber.id, ids: grupo.ids })}
                  aria-label={`${grupo.ocultos.length} turnos más a esta hora. Ver todos`}
                  className="absolute right-1 z-30 inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--brand-gold)] bg-[color:var(--surface-1)] px-2 text-sm font-bold text-[color:var(--brand-gold-hi)] shadow-elevated"
                  style={{ top: Math.max(0, grupo.topPx + grupo.altoPx / 2 - 22) }}
                >
                  +{grupo.ocultos.length}
                </button>
              ))}

            {slotMenu && slotMenu.barberId === barber.id ? (
              <SlotMenu
                time={slotMenu.time}
                top={slotMenu.top}
                onClose={closeSlotMenu}
                onChoose={(mode) => {
                  onCreateAt({ barberId: slotMenu.barberId, time: slotMenu.time, mode });
                  setSlotMenu(null);
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {isDayLocked ? (
        <p className="mb-3 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-3 py-1.5 text-xs text-[color:var(--text-secondary)]">
          <CalendarX aria-hidden="true" className="size-3.5 shrink-0 text-[color:var(--text-muted)]" />
          {isReadOnly ? READ_ONLY_REASON : "Día pasado: se puede consultar, no mover."}
        </p>
      ) : (
        <p className="mb-3 text-xs text-[color:var(--text-muted)]">
          <span className="hidden sm:inline">
            Tocá un turno para ver el detalle, un hueco para cargar y arrastrá para mover.
          </span>
          <span className="sm:hidden">
            Tocá un turno o un hueco. Mantené apretado para mover.
          </span>
        </p>
      )}

      <div
        className={cn(
          "rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)]",
          // Escritorio: scroll de costado si hay muchos barberos (solo eje x:
          // con el vertical en auto se armaba un scroller de 12 px que se comía
          // el gesto de bajar la página). Celular: una columna, sin scroll lateral.
          isMobile ? "overflow-hidden" : "overflow-x-auto overflow-y-hidden overscroll-x-contain",
        )}
      >
        <div style={{ minWidth: columnsMinWidth }}>
          {isMobile ? (
            <div className="sticky top-0 z-30 border-b border-[color:var(--border-default)] bg-[color:var(--surface-2)]">
              {columns.length > 1 ? (
                <AgendaBarberSwitcher
                  barbers={columns.map((c) => ({
                    id: c.barber.id,
                    name: barberDisplayName(c.barber),
                    count: statsByBarber.get(c.barber.id)?.total ?? 0,
                    offDay: c.isOffDay,
                  }))}
                  selectedId={effectiveSelectedId ?? ""}
                  onSelect={selectBarber}
                />
              ) : null}
              {selectedColumn ? (
                <p className="px-3 pb-2 pt-1 text-xs text-[color:var(--text-muted)]">
                  {columns.length === 1 ? (
                    <span className="font-semibold text-white">{barberDisplayName(selectedColumn.barber)} · </span>
                  ) : null}
                  {selectedColumn.isOffDay
                    ? "Franco, con turnos cargados"
                    : `${selectedColumn.schedule.startTime.slice(0, 5)}–${selectedColumn.schedule.endTime.slice(0, 5)}`}
                  {selectedStats?.nextTime ? ` · próximo ${selectedStats.nextTime}` : ""}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="sticky top-0 z-30 flex border-b border-[color:var(--border-default)] bg-[color:var(--surface-2)]">
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-[color:var(--border-subtle)] bg-[color:var(--surface-2)]"
                style={{ width: RULER_WIDTH_PX }}
              />
              {columns.map(({ barber, schedule, isOffDay }) => {
                const stats = statsByBarber.get(barber.id);
                return (
                  <div
                    key={`header-${barber.id}`}
                    className="flex-1 border-r border-[color:var(--border-subtle)] px-3 py-2 last:border-r-0"
                    style={{ minWidth: MIN_COL_WIDTH_PX }}
                  >
                    <p className="truncate text-sm font-semibold text-white">{barberDisplayName(barber)}</p>
                    <p className="mt-0.5 truncate text-xs text-[color:var(--text-muted)]">
                      <span className="font-semibold text-[color:var(--brand-gold)]">
                        {stats?.total ?? 0} turno{(stats?.total ?? 0) === 1 ? "" : "s"}
                      </span>
                      {isOffDay ? " · franco" : ""}
                      {stats?.nextTime
                        ? ` · próximo ${stats.nextTime}`
                        : isOffDay
                          ? ""
                          : ` · ${schedule.startTime.slice(0, 5)}–${schedule.endTime.slice(0, 5)}`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {isMobile ? (
            <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              <motion.div
                key={effectiveSelectedId ?? "none"}
                initial={reduceMotion ? false : { opacity: 0, x: slideDirection * 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                {body}
              </motion.div>
            </div>
          ) : (
            body
          )}
        </div>
      </div>

      <DragOverlay>
        {activeAppointment ? (
          <DraggableAppointmentBlock
            appointment={activeAppointment}
            durationMinutes={duracionDibujada(activeAppointment, interval)}
            isOverlay
          />
        ) : null}
      </DragOverlay>

      <AgendaSheet
        open={openGroup !== null}
        onClose={() => setOpenGroup(null)}
        title={`${groupAppointments.length} turnos encimados`}
        subtitle={
          groupAppointments[0]
            ? `Desde las ${groupAppointments[0].appointment_time.slice(0, 5)}`
            : undefined
        }
      >
        <ul className="flex flex-col gap-2">
          {groupAppointments.map((appointment) => (
            <li key={appointment.id}>
              <button
                type="button"
                onClick={() => {
                  setOpenGroup(null);
                  if (appointment.id) onOpenAppointment(appointment.id);
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-2)] px-3 py-2 text-left hover:border-[color:var(--brand-gold)]"
              >
                <span className="font-mono text-sm font-semibold text-[color:var(--brand-gold)]">
                  {appointment.appointment_time.slice(0, 5)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">
                    {appointment.customer_name}
                  </span>
                  <span className="block truncate text-xs text-[color:var(--text-secondary)]">
                    {appointment.is_sobreturno ? "Sobreturno · " : ""}
                    {appointment.service_name} · {duracionDibujada(appointment, interval)} min
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </AgendaSheet>

      <RescheduleNotifyDialog
        context={notifyContext}
        barbershopSlug={barbershopSlug}
        barbershopName={barbershopName}
        onClose={() => setNotifyContext(null)}
      />
    </DndContext>
  );
}
