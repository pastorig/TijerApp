"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Copy, X } from "lucide-react";
import { createPendingAppointment } from "@/lib/appointments";
import { cn } from "@/lib/cn";
import { formatDateWithWeekday } from "@/lib/format";
import type { AppointmentRow } from "@/lib/supabase";

type DuplicateAppointmentModalProps = {
  isOpen: boolean;
  appointment: AppointmentRow | null;
  onClose: () => void;
  onCreated: (newAppointmentId: string) => void;
};

/** Cada cuánto se repite el turno fijo. */
type Frequency = "once" | "weekly" | "biweekly" | "monthly";

const FREQUENCY_OPTIONS: Array<{ value: Frequency; label: string }> = [
  { value: "once", label: "Una vez" },
  { value: "weekly", label: "Cada semana" },
  { value: "biweekly", label: "Cada 15 días" },
  { value: "monthly", label: "Cada mes" },
];

function addDays(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(dateIso: string, months: number): string {
  const d = new Date(`${dateIso}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * Genera las fechas de las ocurrencias a partir de la primera, según la
 * frecuencia y la cantidad. La primera siempre es `firstDate`.
 */
function buildOccurrenceDates(
  firstDate: string,
  frequency: Frequency,
  count: number,
): string[] {
  if (frequency === "once") return [firstDate];
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    if (frequency === "weekly") dates.push(addDays(firstDate, i * 7));
    else if (frequency === "biweekly") dates.push(addDays(firstDate, i * 14));
    else dates.push(addMonths(firstDate, i)); // monthly
  }
  return dates;
}

export function DuplicateAppointmentModal({
  isOpen,
  appointment,
  onClose,
  onCreated,
}: DuplicateAppointmentModalProps) {
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("once");
  const [count, setCount] = useState(4);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resultMessage, setResultMessage] = useState("");

  // Pre-fill cuando se abre el modal: misma hora, 1 semana después.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen && appointment) {
      setNewDate(addDays(appointment.appointment_date, 7));
      setNewTime(appointment.appointment_time);
      setFrequency("once");
      setCount(4);
      setErrorMessage("");
      setResultMessage("");
    }
  }, [isOpen, appointment]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Escape cierra
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !appointment) return null;

  const isRecurring = frequency !== "once";
  const occurrencePreview = newDate
    ? buildOccurrenceDates(newDate, frequency, count)
    : [];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!appointment) return;
    if (!newDate || !newTime) {
      setErrorMessage("Completá fecha y horario.");
      return;
    }
    setErrorMessage("");
    setResultMessage("");
    setIsSaving(true);

    const timeNormalized =
      newTime.length === 5 ? `${newTime}:00` : newTime;
    const dates = buildOccurrenceDates(newDate, frequency, count);

    let createdCount = 0;
    let skippedCount = 0;
    let firstCreatedId: string | null = null;

    try {
      // Creamos las ocurrencias una por una. Si un slot está ocupado
      // (23505 / error), lo salteamos y seguimos con el resto.
      for (const date of dates) {
        const { data, error } = await createPendingAppointment({
          barbershop_slug: appointment.barbershop_slug,
          barber_id: appointment.barber_id,
          barber_name: appointment.barber_name,
          customer_name: appointment.customer_name,
          customer_phone: appointment.customer_phone,
          customer_email: appointment.customer_email ?? null,
          service_name: appointment.service_name,
          service_price: appointment.service_price,
          service_duration_minutes: appointment.service_duration_minutes,
          appointment_date: date,
          appointment_time: timeNormalized,
          comment: appointment.comment ?? "",
        });
        if (error || !data?.id) {
          skippedCount += 1;
        } else {
          createdCount += 1;
          if (!firstCreatedId) firstCreatedId = data.id;
        }
      }

      if (createdCount === 0) {
        setErrorMessage(
          "No se pudo crear ningún turno. ¿Esos horarios ya están ocupados?",
        );
        return;
      }

      // Éxito: refrescamos la lista con el primer turno creado.
      if (firstCreatedId) onCreated(firstCreatedId);

      if (!isRecurring) {
        onClose();
        return;
      }

      // Turno fijo: mostramos resumen (cuántos creó, cuántos saltó) y
      // cerramos tras un momento para que el barbero lo lea.
      setResultMessage(
        skippedCount > 0
          ? `Listo: creé ${createdCount} turnos. ${skippedCount} se saltearon (horario ocupado).`
          : `Listo: creé ${createdCount} turnos fijos.`,
      );
      setTimeout(() => onClose(), 1800);
    } catch {
      setErrorMessage("No pudimos crear el turno.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Repetir turno"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-t-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] shadow-2xl sm:rounded-[var(--radius-lg)]">
        <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
              Repetir / turno fijo
            </p>
            <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
              Repetí este turno una vez o fijalo cada semana, 15 días o mes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex size-8 items-center justify-center rounded-[var(--radius-xs)] text-[color:var(--text-subtle)] transition-colors hover:bg-[color:var(--surface-1)] hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          {/* Resumen del turno original */}
          <div className="rounded-[var(--radius-xs)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
              Cliente y servicio
            </p>
            <p className="mt-1.5 text-sm font-bold text-white">
              {appointment.customer_name}
            </p>
            <p className="text-xs text-[color:var(--text-secondary)]">
              {appointment.service_name} ·{" "}
              <span className="text-[color:var(--brand-gold)]">
                {appointment.barber_name}
              </span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="dup-date"
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
                >
                  {isRecurring ? "Primer turno" : "Nueva fecha"}
                </label>
                <input
                  id="dup-date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  disabled={isSaving}
                  className="mt-1.5 min-h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="dup-time"
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
                >
                  Horario
                </label>
                <input
                  id="dup-time"
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  disabled={isSaving}
                  className="mt-1.5 min-h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
                  required
                />
              </div>
            </div>

            {/* Selector de frecuencia */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                ¿Cada cuánto?
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {FREQUENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFrequency(opt.value)}
                    disabled={isSaving}
                    className={cn(
                      "min-h-10 rounded-[var(--radius-sm)] border px-2 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors",
                      frequency === opt.value
                        ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)] text-black"
                        : "border-[color:var(--border-default)] bg-black text-[color:var(--text-secondary)] hover:border-[color:var(--brand-gold)]",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cantidad de repeticiones (solo si es fijo) */}
            {isRecurring ? (
              <div>
                <label
                  htmlFor="dup-count"
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
                >
                  ¿Cuántas veces? ({count})
                </label>
                <input
                  id="dup-count"
                  type="range"
                  min={2}
                  max={12}
                  step={1}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  disabled={isSaving}
                  className="mt-2 w-full accent-[color:var(--brand-gold)]"
                />
                {occurrencePreview.length > 0 ? (
                  <p className="mt-1.5 text-[10px] leading-4 text-[color:var(--text-subtle)]">
                    Del{" "}
                    <span className="text-[color:var(--text-secondary)]">
                      {formatDateWithWeekday(occurrencePreview[0])}
                    </span>{" "}
                    al{" "}
                    <span className="text-[color:var(--text-secondary)]">
                      {formatDateWithWeekday(
                        occurrencePreview[occurrencePreview.length - 1],
                      )}
                    </span>
                    .
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-[10px] text-[color:var(--text-subtle)]">
                Por defecto, 1 semana después, mismo horario. Ajustalo o
                elegí una frecuencia para hacerlo fijo.
              </p>
            )}

            {errorMessage ? (
              <p
                role="alert"
                className="border-l-2 border-[color:var(--danger)] pl-3 text-sm font-semibold text-[color:var(--danger)]"
              >
                {errorMessage}
              </p>
            ) : null}

            {resultMessage ? (
              <p
                role="status"
                className="rounded-[var(--radius-sm)] border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-3 py-2 text-sm font-semibold text-[color:var(--success)]"
              >
                {resultMessage}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className={cn(
                  "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {isRecurring ? (
                  <CalendarClock className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {isSaving
                  ? "Creando…"
                  : isRecurring
                    ? `Crear ${count} turnos`
                    : "Crear turno"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
