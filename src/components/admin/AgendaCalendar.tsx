"use client";

/**
 * AgendaCalendar
 *
 * Calendario tipo "Google Calendar mobile" para el admin de BarberSync.
 *
 *   ┌───────────────────────────────────┐
 *   │  Miércoles 20 de mayo    [Hoy]    │  ← header (día activo + Hoy / flechas)
 *   │  Lun Mar Mié Jue Vie Sáb Dom      │  ← labels
 *   │   18  19 [20] 21  22  23  24      │  ← strip semanal (tap = cambiar día)
 *   │            ──                     │  ← drag handle (tap o swipe = expand)
 *   └───────────────────────────────────┘
 *
 * Cuando se expande, la grilla pasa a 6 filas (vista mensual completa).
 * Swipe horizontal cambia la semana (colapsado) o el mes (expandido).
 *
 * Estilo: minimalista BarberSync (negro / gold / silver).
 */

import { useMemo, useRef, useState } from "react";
import { CalendarX, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  formatDayHeading,
  formatMonthYear,
  getMonthGrid,
  getTodayYmd,
  getWeekDays,
  parseYmd,
  toYmd,
  WEEKDAY_LABELS_SHORT,
} from "./date-utils";

type AgendaCalendarProps = {
  focusDate: string;
  onFocusDateChange: (date: string) => void;
  /** Map "YYYY-MM-DD" → cantidad de turnos. Opcional, para mostrar dots. */
  countsByDay?: Record<string, number>;
  /**
   * Quick action contextual al pie del calendario para el día enfocado.
   * Si está presente, se muestra una fila con botones de acción para
   * el día actualmente seleccionado.
   */
  onQuickBlock?: (date: string) => void;
};

/**
 * Colores del dot según cantidad de turnos:
 * - 0: no dot
 * - 1-3: verde (tranquilo)
 * - 4-6: amber (lleno)
 * - 7+: rojo (sobrecarga)
 */
function dotColorClass(count: number | undefined, isToday: boolean): string {
  if (!count || count === 0) return "";
  if (count >= 7) return "bg-[color:var(--danger)]";
  if (count >= 4) return "bg-amber-400";
  if (count >= 1) return "bg-[color:var(--success)]";
  return isToday
    ? "bg-[color:var(--brand-gold)]"
    : "bg-[color:var(--brand-silver)]";
}

const SWIPE_THRESHOLD = 40;

export function AgendaCalendar({
  focusDate,
  onFocusDateChange,
  countsByDay,
  onQuickBlock,
}: AgendaCalendarProps) {
  const [isMonthExpanded, setIsMonthExpanded] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const d = parseYmd(focusDate);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Sincronizamos visibleMonth con focusDate cuando éste cambia desde afuera.
  // Patrón "adjusting state based on props during render"
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-state-when-a-prop-changes).
  const [prevFocusDate, setPrevFocusDate] = useState(focusDate);
  if (focusDate !== prevFocusDate) {
    setPrevFocusDate(focusDate);
    const focused = parseYmd(focusDate);
    const focusedMonthStart = new Date(focused.getFullYear(), focused.getMonth(), 1);
    if (focusedMonthStart.getTime() !== visibleMonth.getTime()) {
      setVisibleMonth(focusedMonthStart);
    }
  }

  const today = useMemo(() => getTodayYmd(), []);
  const weekDays = useMemo(() => getWeekDays(focusDate), [focusDate]);
  const monthGrid = useMemo(
    () => getMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  );

  function navigateMonth(direction: -1 | 1) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  }

  function navigateWeek(direction: -1 | 1) {
    const next = parseYmd(focusDate);
    next.setDate(next.getDate() + 7 * direction);
    onFocusDateChange(toYmd(next));
  }

  function handleSelectDay(ymd: string) {
    onFocusDateChange(ymd);
    setIsMonthExpanded(false);
  }

  function handleGoToToday() {
    const d = parseYmd(today);
    setVisibleMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    onFocusDateChange(today);
  }

  // ── Swipe gestures (mobile + desktop drag) ─────────────────────────
  const startRef = useRef({ x: 0, y: 0, t: 0 });
  const isMouseDraggingRef = useRef(false);
  const recentlyDraggedRef = useRef(false);

  function navigateByDelta(dx: number, dy: number) {
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (adx > ady && adx > SWIPE_THRESHOLD) {
      recentlyDraggedRef.current = true;
      window.setTimeout(() => {
        recentlyDraggedRef.current = false;
      }, 350);
      const direction: -1 | 1 = dx < 0 ? 1 : -1;
      if (isMonthExpanded) navigateMonth(direction);
      else navigateWeek(direction);
    }
  }

  function handleCalendarTouchStart(event: React.TouchEvent) {
    const t = event.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }

  function handleCalendarTouchEnd(event: React.TouchEvent) {
    const t = event.changedTouches[0];
    navigateByDelta(
      t.clientX - startRef.current.x,
      t.clientY - startRef.current.y,
    );
  }

  function handleCalendarMouseDown(event: React.MouseEvent) {
    if (event.button !== 0) return;
    startRef.current = { x: event.clientX, y: event.clientY, t: Date.now() };
    isMouseDraggingRef.current = true;

    // Listeners a nivel document: capturan el release aunque el usuario
    // suelte el mouse fuera del calendario (frecuente al hacer swipe largo).
    // Antes el onMouseUp/onMouseLeave de React cancelaba el gesto si el
    // cursor salía del contenedor, haciendo el swipe casi inusable.
    function handleDocMouseUp(docEvent: MouseEvent) {
      document.removeEventListener("mouseup", handleDocMouseUp);
      if (!isMouseDraggingRef.current) return;
      isMouseDraggingRef.current = false;
      navigateByDelta(
        docEvent.clientX - startRef.current.x,
        docEvent.clientY - startRef.current.y,
      );
    }
    document.addEventListener("mouseup", handleDocMouseUp);
  }

  function handleCalendarClickCapture(event: React.MouseEvent) {
    if (recentlyDraggedRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  // ── Drag handle ────────────────────────────────────────────────────
  const handleStartRef = useRef({ y: 0, t: 0 });
  const recentlyTouched = useRef(false);

  function handleDragTouchStart(event: React.TouchEvent) {
    handleStartRef.current = {
      y: event.touches[0].clientY,
      t: Date.now(),
    };
  }

  function handleDragTouchEnd(event: React.TouchEvent) {
    const dy = event.changedTouches[0].clientY - handleStartRef.current.y;
    const elapsed = Date.now() - handleStartRef.current.t;
    recentlyTouched.current = true;
    window.setTimeout(() => {
      recentlyTouched.current = false;
    }, 350);

    if (Math.abs(dy) < 8 && elapsed < 250) {
      setIsMonthExpanded((prev) => !prev);
      return;
    }
    if (dy > 25 && !isMonthExpanded) setIsMonthExpanded(true);
    if (dy < -25 && isMonthExpanded) setIsMonthExpanded(false);
  }

  function handleDragClick(event: React.MouseEvent) {
    if (recentlyTouched.current) {
      event.preventDefault();
      return;
    }
    setIsMonthExpanded((prev) => !prev);
  }

  return (
    <div className="bg-[color:var(--surface-0)]">
      {/* Header — día activo o mes */}
      <header className="flex items-center justify-between gap-3 px-1 pb-4">
        {isMonthExpanded ? (
          <button
            type="button"
            onClick={() => setIsMonthExpanded(false)}
            className="min-w-0 flex-1 text-left text-xl font-black uppercase tracking-tight text-white sm:text-2xl"
          >
            <span className="truncate">{formatMonthYear(visibleMonth)}</span>
          </button>
        ) : (
          <h2 className="min-w-0 flex-1 truncate text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
            {formatDayHeading(focusDate)}
          </h2>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {isMonthExpanded ? (
            <>
              <IconButton
                onClick={() => navigateMonth(-1)}
                ariaLabel="Mes anterior"
              >
                <ChevronLeft className="size-4" />
              </IconButton>
              <IconButton
                onClick={() => navigateMonth(1)}
                ariaLabel="Mes siguiente"
              >
                <ChevronRight className="size-4" />
              </IconButton>
            </>
          ) : (
            <button
              type="button"
              onClick={handleGoToToday}
              className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
            >
              Hoy
            </button>
          )}
        </div>
      </header>

      {/* Labels Lun–Dom */}
      <div className="grid grid-cols-7 gap-1 px-1 pb-2">
        {WEEKDAY_LABELS_SHORT.map((label) => (
          <div
            key={label}
            className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grilla animada */}
      <div
        onTouchStart={handleCalendarTouchStart}
        onTouchEnd={handleCalendarTouchEnd}
        onMouseDown={handleCalendarMouseDown}
        onClickCapture={handleCalendarClickCapture}
        className="select-none overflow-hidden transition-[max-height] duration-[500ms] ease-[var(--ease-out-soft)] cursor-grab active:cursor-grabbing"
        style={{
          // Collapsed: alcanza para h-12 (mobile) y h-14 (desktop) de DayCell.
          // Expanded: 6 rows × h-14 (56px) + 5 gaps × 4px ≈ 356px → 380 con margen.
          maxHeight: isMonthExpanded ? "380px" : "64px",
        }}
      >
        {isMonthExpanded ? (
          <div className="grid grid-cols-7 gap-1 px-1 pb-1">
            {monthGrid.map((cell) => (
              <DayCell
                key={cell.ymd}
                day={cell.day}
                ymd={cell.ymd}
                isFocused={cell.ymd === focusDate}
                isToday={cell.ymd === today}
                inCurrentMonth={cell.inCurrentMonth}
                count={countsByDay?.[cell.ymd]}
                onClick={() => handleSelectDay(cell.ymd)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1 px-1 pb-1">
            {weekDays.map((ymd) => (
              <DayCell
                key={ymd}
                day={parseYmd(ymd).getDate()}
                ymd={ymd}
                isFocused={ymd === focusDate}
                isToday={ymd === today}
                inCurrentMonth
                count={countsByDay?.[ymd]}
                onClick={() => handleSelectDay(ymd)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick action contextual al día enfocado */}
      {onQuickBlock ? (
        <div className="flex items-center justify-between gap-2 border-t border-[color:var(--border-subtle)] px-3 py-2">
          <p className="truncate text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            Acción rápida del día
          </p>
          <button
            type="button"
            onClick={() => onQuickBlock(focusDate)}
            className="inline-flex items-center gap-1 rounded-[var(--radius-xs)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
          >
            <CalendarX className="size-3" aria-hidden="true" />
            Bloquear hora
          </button>
        </div>
      ) : null}

      {/* Drag handle */}
      <div
        role="button"
        tabIndex={0}
        aria-label={
          isMonthExpanded ? "Colapsar a vista semanal" : "Expandir a vista mensual"
        }
        onTouchStart={handleDragTouchStart}
        onTouchEnd={handleDragTouchEnd}
        onClick={handleDragClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsMonthExpanded((prev) => !prev);
          }
        }}
        className="flex w-full cursor-pointer select-none justify-center py-3 active:opacity-60"
      >
        <span
          aria-hidden="true"
          className="h-[3px] rounded-full bg-[color:var(--border-strong)] transition-all duration-[var(--duration-fast)]"
          style={{ width: isMonthExpanded ? "44px" : "32px" }}
        />
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */

function DayCell({
  day,
  isFocused,
  isToday,
  inCurrentMonth,
  count,
  onClick,
}: {
  day: number;
  ymd: string;
  isFocused: boolean;
  isToday: boolean;
  inCurrentMonth: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // Altura fija (no aspect-square) — garantiza centrado consistente entre
        // vista semanal colapsada y mensual expandida. Antes el aspect-square
        // en desktop hacía cells de ~80px de alto, recortadas por el maxHeight
        // del contenedor, dejando el número visualmente en la parte inferior.
        "relative flex h-12 items-center justify-center rounded-[var(--radius-sm)] font-mono text-xs font-bold tabular-nums transition-colors duration-[var(--duration-fast)] sm:h-14 sm:text-sm",
        isFocused
          ? "bg-[color:var(--brand-gold)] text-black"
          : isToday
            ? "border border-[color:var(--brand-gold)] text-[color:var(--brand-gold)]"
            : inCurrentMonth
              ? "text-white hover:bg-[color:var(--surface-2)]"
              : "text-[color:var(--text-subtle)] hover:bg-[color:var(--surface-2)]",
      )}
    >
      {day}
      {count && count > 0 && !isFocused ? (
        <span
          aria-hidden="true"
          title={`${count} ${count === 1 ? "turno" : "turnos"}`}
          className={cn(
            "absolute bottom-1.5 size-1.5 rounded-full",
            dotColorClass(count, isToday),
          )}
        />
      ) : null}
    </button>
  );
}

function IconButton({
  onClick,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
    >
      {children}
    </button>
  );
}
