"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarX, X } from "lucide-react";
import { createTimeBlock } from "@/lib/barber-availability";
import { cn } from "@/lib/cn";

type QuickBlockBarber = {
  id: string;
  name: string;
};

type QuickBlockTimeButtonProps = {
  barbershopSlug: string;
  /** Lista de barberos activos. Si solo hay uno, ocultamos el selector. */
  barbers: QuickBlockBarber[];
  /** Fecha enfocada actual en el turnero (YYYY-MM-DD). Pre-llena el form. */
  focusDate: string;
  /** Si el filtro de barbero está apuntando a uno concreto, lo pre-seleccionamos. */
  preselectedBarberId?: string;
  /** Callback cuando se crea un bloqueo, para que el padre refresque agenda si necesita. */
  onBlockCreated?: () => void;
  /**
   * Si está presente, el modal pasa a ser controlado externamente y el
   * trigger button NO se renderiza. Sirve para abrir el form desde otros
   * lugares (ej: calendario).
   */
  controlledOpen?: boolean;
  onControlledClose?: () => void;
};

export function QuickBlockTimeButton({
  barbershopSlug,
  barbers,
  focusDate,
  preselectedBarberId,
  onBlockCreated,
  controlledOpen,
  onControlledClose,
}: QuickBlockTimeButtonProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const closeModal = () => {
    if (isControlled) {
      onControlledClose?.();
    } else {
      setInternalOpen(false);
    }
  };
  const [barberId, setBarberId] = useState("");
  const [blockDate, setBlockDate] = useState(focusDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const onlyOneBarber = barbers.length === 1;
  const defaultBarberId = useMemo(() => {
    if (preselectedBarberId && preselectedBarberId !== "all") {
      return preselectedBarberId;
    }
    return barbers[0]?.id ?? "";
  }, [preselectedBarberId, barbers]);

  // Reset/pre-fill al abrir el modal
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      setBarberId(defaultBarberId);
      setBlockDate(focusDate);
      setStartTime("");
      setEndTime("");
      setReason("");
      setErrorMessage("");
      setSuccessMessage("");
    }
  }, [isOpen, defaultBarberId, focusDate]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!barberId || !blockDate || !startTime || !endTime) {
      setErrorMessage("Completá barbero, fecha, hora inicio y hora fin.");
      return;
    }
    if (startTime >= endTime) {
      setErrorMessage("La hora fin tiene que ser mayor a la hora inicio.");
      return;
    }
    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);
    try {
      const { error } = await createTimeBlock({
        barbershop_slug: barbershopSlug,
        barber_id: barberId,
        block_date: blockDate,
        start_time: startTime,
        end_time: endTime,
        reason: reason.trim() || null,
        is_active: true,
        deleted_at: null,
      });
      if (error) {
        setErrorMessage("No pudimos crear el bloqueo.");
        return;
      }
      setSuccessMessage("Bloqueo creado.");
      onBlockCreated?.();
      // Cerramos a los 800ms para que se lea el OK
      window.setTimeout(closeModal, 800);
    } catch {
      setErrorMessage("No pudimos crear el bloqueo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {!isControlled ? (
        <button
          type="button"
          onClick={() => setInternalOpen(true)}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
          aria-label="Bloquear horario"
        >
          <CalendarX className="size-3.5" aria-hidden="true" />
          Bloquear hora
        </button>
      ) : null}

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Bloquear horario"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-t-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] shadow-2xl sm:rounded-[var(--radius-lg)]">
            <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
                  Bloquear horario
                </p>
                <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                  Cubrir un hueco para que el público no pueda reservarlo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => closeModal()}
                aria-label="Cerrar"
                className="inline-flex size-8 items-center justify-center rounded-[var(--radius-xs)] text-[color:var(--text-subtle)] transition-colors hover:bg-[color:var(--surface-1)] hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 p-5">
              {!onlyOneBarber ? (
                <div>
                  <label
                    htmlFor="quick-block-barber"
                    className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
                  >
                    Barbero
                  </label>
                  <select
                    id="quick-block-barber"
                    value={barberId}
                    onChange={(e) => setBarberId(e.target.value)}
                    disabled={isSaving}
                    className="mt-1.5 min-h-11 w-full appearance-none rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
                  >
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="quick-block-date"
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
                >
                  Fecha
                </label>
                <input
                  id="quick-block-date"
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  disabled={isSaving}
                  className="mt-1.5 min-h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="quick-block-start"
                    className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
                  >
                    Desde
                  </label>
                  <input
                    id="quick-block-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={isSaving}
                    className="mt-1.5 min-h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="quick-block-end"
                    className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
                  >
                    Hasta
                  </label>
                  <input
                    id="quick-block-end"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={isSaving}
                    className="mt-1.5 min-h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="quick-block-reason"
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
                >
                  Motivo (opcional)
                </label>
                <input
                  id="quick-block-reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isSaving}
                  maxLength={120}
                  placeholder="Ej: dentista, reunión, descanso"
                  className="mt-1.5 min-h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                />
              </div>

              {errorMessage ? (
                <p
                  role="alert"
                  className="border-l-2 border-[color:var(--danger)] pl-3 text-sm font-semibold text-[color:var(--danger)]"
                >
                  {errorMessage}
                </p>
              ) : null}
              {successMessage ? (
                <p className="border-l-2 border-[color:var(--success)] pl-3 text-sm font-semibold text-[color:var(--success)]">
                  {successMessage}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className={cn(
                    "inline-flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-sm)] bg-gold-grad px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  {isSaving ? "Guardando…" : "Bloquear"}
                </button>
                <button
                  type="button"
                  onClick={() => closeModal()}
                  disabled={isSaving}
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
