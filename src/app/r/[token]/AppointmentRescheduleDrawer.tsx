"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

type AppointmentRescheduleDrawerProps = {
  token: string;
  currentDate: string;
  currentTime: string;
  onCancel: () => void;
  onSuccess: (newDate: string, newTime: string) => void;
};

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function ymdPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function formatTimeShort(time: string): string {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

export function AppointmentRescheduleDrawer({
  token,
  currentDate,
  currentTime,
  onCancel,
  onSuccess,
}: AppointmentRescheduleDrawerProps) {
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedTime, setSelectedTime] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadSlots() {
      setIsLoadingSlots(true);
      setErrorMessage("");
      setSelectedTime("");
      try {
        const url = `/api/appointments/available-slots?token=${encodeURIComponent(token)}&date=${selectedDate}`;
        const response = await fetch(url);
        if (!response.ok) {
          if (!isMounted) return;
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          setErrorMessage(payload.error ?? "No pudimos cargar horarios.");
          setAvailableTimes([]);
          return;
        }
        const payload = (await response.json()) as {
          available: string[];
        };
        if (!isMounted) return;
        setAvailableTimes(payload.available);
      } catch {
        if (isMounted) {
          setErrorMessage("No pudimos cargar horarios.");
          setAvailableTimes([]);
        }
      } finally {
        if (isMounted) setIsLoadingSlots(false);
      }
    }
    loadSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, token]);

  async function handleSubmit() {
    if (!selectedTime) {
      setErrorMessage("Elegí un horario.");
      return;
    }
    if (selectedDate === currentDate && selectedTime === formatTimeShort(currentTime)) {
      setErrorMessage("Elegí un horario distinto al actual.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/appointments/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newDate: selectedDate,
          newTime: selectedTime,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorMessage(payload.error ?? "No pudimos reagendar.");
        return;
      }
      onSuccess(selectedDate, selectedTime);
    } catch {
      setErrorMessage("No pudimos reagendar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const today = todayYmd();
  const maxDate = ymdPlusDays(45); // permite reagendar hasta 45 días adelante

  return (
    <div className="grid gap-6">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
      >
        <ArrowLeft className="size-3" />
        Volver
      </button>

      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
          Reagendar turno
        </p>
        <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-balance text-white sm:text-3xl">
          Elegí nueva fecha y hora
        </h2>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
          Tu turno actual: {formatTimeShort(currentTime)} del {currentDate}.
        </p>
      </header>

      {/* Selector de fecha */}
      <div>
        <label
          htmlFor="reschedule-date"
          className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
        >
          Fecha
        </label>
        <div className="mt-2 flex items-center gap-2">
          <CalendarDays className="size-4 text-[color:var(--text-muted)]" />
          <input
            id="reschedule-date"
            type="date"
            value={selectedDate}
            min={today}
            max={maxDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="min-h-11 flex-1 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
          />
        </div>
      </div>

      {/* Slots disponibles */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
          Horario
        </p>
        {isLoadingSlots ? (
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            Cargando horarios…
          </p>
        ) : availableTimes.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--text-subtle)]">
            No hay horarios disponibles ese día. Probá otra fecha.
          </p>
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {availableTimes.map((time) => {
              const isSelected = time === selectedTime;
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={cn(
                    "min-h-11 rounded-[var(--radius-sm)] border font-mono text-xs font-bold tabular-nums transition-colors duration-[var(--duration-fast)]",
                    isSelected
                      ? "border-[color:var(--brand-gold)] bg-gold-grad text-black"
                      : "border-[color:var(--border-default)] text-white hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]",
                  )}
                >
                  {formatTimeShort(time)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="border-l-2 border-[color:var(--danger)] pl-4 text-sm font-semibold text-[color:var(--danger)]"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Volver
        </Button>
        <Button
          type="button"
          size="md"
          loading={isSubmitting}
          disabled={isSubmitting || !selectedTime}
          onClick={handleSubmit}
        >
          Confirmar reagendar
        </Button>
      </div>
    </div>
  );
}
