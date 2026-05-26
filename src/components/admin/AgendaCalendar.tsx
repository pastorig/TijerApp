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
import { ChevronLeft, ChevronRight } from "lucide-react";
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
};

const SWIPE_THRESHOLD = 40;

export function AgendaCalendar({
  focusDate,
  onFocusDateChange,
  countsByDay,
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

  // ── Swipe gestures ─────────────────────────────────────────────────
  const startRef = useRef({ x: 0, y: 0, t: 0 });

  function handleCalendarTouchStart(event: React.TouchEvent) {
    const t = event.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }

  function handleCalendarTouchEnd(event: React.TouchEvent) {
    const t = event.changedTouches[0];
    const dx = t.clientX - startRef.current.x;
    const dy = t.clientY - startRef.current.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (adx > ady && adx > SWIPE_THRESHOLD) {
      const direction: -1 | 1 = dx < 0 ? 1 : -1;
      if (isMonthExpanded) navigateMonth(direction);
      else navigateWeek(direction);
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
        className="overflow-hidden transition-[max-height] duration-[500ms] ease-[var(--ease-out-soft)]"
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
          className={cn(
            "absolute bottom-1.5 size-1 rounded-full",
            isToday
              ? "bg-[color:var(--brand-gold)]"
              : "bg-[color:var(--brand-silver)]",
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
