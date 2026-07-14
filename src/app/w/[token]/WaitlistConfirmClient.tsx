"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDateForDisplay, normalizeDateValue } from "@/lib/format";

type WaitlistEntry = {
  id: string;
  barbershop_slug: string;
  barbershop_name: string;
  barber_name: string;
  service_name: string;
  service_duration_minutes: number;
  customer_name: string;
  customer_phone: string;
  preferred_date: string;
  status: "pending" | "contacted" | "fulfilled" | "cancelled";
  notes: string | null;
};

type WaitlistConfirmClientProps = {
  token: string;
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

export function WaitlistConfirmClient({ token }: WaitlistConfirmClientProps) {
  const [entry, setEntry] = useState<WaitlistEntry | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(todayYmd());
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmedAppointmentToken, setConfirmedAppointmentToken] = useState<
    string | null
  >(null);

  // Load entry
  useEffect(() => {
    let isMounted = true;
    async function loadEntry() {
      setIsLoading(true);
      setLoadError("");
      try {
        const response = await fetch(
          `/api/waitlist/by-token?token=${encodeURIComponent(token)}`,
        );
        if (!response.ok) {
          if (!isMounted) return;
          setLoadError("No encontramos tu solicitud.");
          return;
        }
        const payload = (await response.json()) as { entry: WaitlistEntry };
        if (!isMounted) return;
        setEntry(payload.entry);
        // Default a la fecha preferida si no es del pasado.
        if (payload.entry.preferred_date >= todayYmd()) {
          setSelectedDate(payload.entry.preferred_date);
        }
      } catch {
        if (isMounted) setLoadError("No encontramos tu solicitud.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadEntry();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Load slots when date changes
  useEffect(() => {
    if (!entry) return;
    if (entry.status === "fulfilled" || entry.status === "cancelled") return;

    let isMounted = true;
    async function loadSlots() {
      setIsLoadingSlots(true);
      setSlotsError("");
      setSelectedTime("");
      try {
        const url = `/api/waitlist/available-slots?token=${encodeURIComponent(token)}&date=${selectedDate}`;
        const response = await fetch(url);
        if (!response.ok) {
          if (!isMounted) return;
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          setSlotsError(payload.error ?? "No pudimos cargar horarios.");
          setAvailableTimes([]);
          return;
        }
        const payload = (await response.json()) as { available: string[] };
        if (!isMounted) return;
        setAvailableTimes(payload.available);
      } catch {
        if (isMounted) {
          setSlotsError("No pudimos cargar horarios.");
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
  }, [selectedDate, token, entry]);

  async function handleConfirm() {
    if (!selectedTime) {
      setSubmitError("Elegí un horario primero.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/waitlist/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          date: selectedDate,
          time: selectedTime,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setSubmitError(payload.error ?? "No pudimos confirmar.");
        return;
      }
      const payload = (await response.json()) as {
        appointmentToken?: string;
      };
      setConfirmedAppointmentToken(payload.appointmentToken ?? null);
    } catch {
      setSubmitError("No pudimos confirmar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <p className="text-sm text-[color:var(--text-muted)]">Cargando…</p>
    );
  }

  if (loadError || !entry) {
    return (
      <article className="animate-fade-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
          Lista de espera
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
          Link inválido
        </h1>
        <p className="mt-4 text-sm text-[color:var(--text-secondary)]">
          {loadError ||
            "No encontramos esta solicitud. Es posible que el link no sea válido o haya expirado."}
        </p>
      </article>
    );
  }

  if (entry.status === "fulfilled") {
    return (
      <article className="animate-fade-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
          Lista de espera
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
          Ya confirmaste un turno
        </h1>
        <p className="mt-4 text-sm text-[color:var(--text-secondary)]">
          Esta solicitud ya fue resuelta. Si necesitás cambiar algo,
          contactá a {entry.barbershop_name} directamente.
        </p>
      </article>
    );
  }

  if (confirmedAppointmentToken) {
    return (
      <article className="animate-fade-up text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] text-[color:var(--success)]">
          <CheckCircle2 className="size-7" />
        </div>
        <h1 className="mt-6 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
          Turno reservado
        </h1>
        <p className="mt-4 text-sm leading-7 text-[color:var(--text-secondary)]">
          Te reservamos el turno con {entry.barber_name} el{" "}
          {formatDateForDisplay(normalizeDateValue(selectedDate))} a las{" "}
          {selectedTime.slice(0, 5)} hs. Espera la confirmación de{" "}
          {entry.barbershop_name}.
        </p>
        <Link
          href={`/r/${confirmedAppointmentToken}`}
          className="mt-8 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] bg-gold-grad px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)]"
        >
          Ver detalle del turno
        </Link>
      </article>
    );
  }

  return (
    <article className="animate-fade-up">
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
        Lista de espera · {entry.barbershop_name}
      </p>
      <h1 className="mt-4 text-3xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-4xl lg:text-5xl">
        Hola {entry.customer_name.split(" ")[0]}!
      </h1>
      <p className="mt-4 text-sm leading-7 text-[color:var(--text-secondary)] sm:text-base">
        Se liberó disponibilidad para que vengas. Elegí día y hora para
        confirmar tu turno con{" "}
        <span className="font-bold text-[color:var(--brand-gold)]">
          {entry.barber_name}
        </span>
        .
      </p>

      <dl className="mt-8 grid gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-4 text-xs text-[color:var(--text-secondary)]">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            Servicio
          </dt>
          <dd className="text-right font-semibold text-white">
            {entry.service_name} · {entry.service_duration_minutes} min
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            Barbero
          </dt>
          <dd className="text-right font-semibold text-white">
            {entry.barber_name}
          </dd>
        </div>
      </dl>

      {/* Selector de fecha */}
      <div className="mt-8">
        <label
          htmlFor="confirm-date"
          className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
        >
          Fecha
        </label>
        <div className="mt-2 flex items-center gap-2">
          <CalendarDays className="size-4 text-[color:var(--text-muted)]" />
          <input
            id="confirm-date"
            type="date"
            value={selectedDate}
            min={todayYmd()}
            max={ymdPlusDays(45)}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="min-h-11 flex-1 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
          />
        </div>
      </div>

      {/* Slots */}
      <div className="mt-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
          Horario
        </p>
        {isLoadingSlots ? (
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            Cargando…
          </p>
        ) : slotsError ? (
          <p className="mt-2 text-sm text-[color:var(--danger)]">
            {slotsError}
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
                  {time.slice(0, 5)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {submitError ? (
        <p className="mt-6 border-l-2 border-[color:var(--danger)] pl-4 text-sm font-semibold text-[color:var(--danger)]">
          {submitError}
        </p>
      ) : null}

      <div className="mt-8">
        <Button
          type="button"
          size="lg"
          fullWidth
          loading={isSubmitting}
          disabled={isSubmitting || !selectedTime}
          onClick={handleConfirm}
        >
          Confirmar mi turno
        </Button>
      </div>

      <p className="mt-10 text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-subtle)]">
        Powered by TijerApp
      </p>
    </article>
  );
}
