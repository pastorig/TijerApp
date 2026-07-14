"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Clock, X } from "lucide-react";
import { createPendingAppointment } from "@/lib/appointments";
import { cn } from "@/lib/cn";
import { formatDateWithWeekday, formatPrice } from "@/lib/format";
import type { BarberRow, BarberServiceRow } from "@/lib/supabase";

type ManualAppointmentModalProps = {
  isOpen: boolean;
  barbershopSlug: string;
  /** Barberos activos de la barbería. */
  barbers: BarberRow[];
  /** Servicios activos (de todos los barberos). */
  services: BarberServiceRow[];
  /** Fecha pre-seleccionada (la que el barbero está viendo en el turnero). */
  defaultDate: string;
  /** Barbero pre-seleccionado si hay un filtro activo. */
  preselectedBarberId?: string;
  onClose: () => void;
  onCreated: () => void;
};

/**
 * Modal para que el barbero agregue un turno MANUAL, incluso FUERA del
 * horario de atención configurado. No valida el horario laboral: si el
 * turno cae antes de abrir o después de cerrar, igual se crea y en el
 * turnero aparece la advertencia de "fuera de horario" que ya existe.
 *
 * Pensado para esos casos en que el barbero quiere encajar un corte
 * antes o después de su horario habitual sin tener que ir a la sección
 * de barberos a estirar la agenda.
 */
export function ManualAppointmentModal({
  isOpen,
  barbershopSlug,
  barbers,
  services,
  defaultDate,
  preselectedBarberId,
  onClose,
  onCreated,
}: ManualAppointmentModalProps) {
  const [barberId, setBarberId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Servicios del barbero elegido (cada servicio tiene barber_id).
  const servicesForBarber = useMemo(
    () => services.filter((s) => s.barber_id === barberId && s.is_active !== false),
    [services, barberId],
  );

  // Pre-fill al abrir.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen) return;
    const firstBarber =
      preselectedBarberId && barbers.some((b) => b.id === preselectedBarberId)
        ? preselectedBarberId
        : (barbers[0]?.id ?? "");
    setBarberId(firstBarber);
    setServiceId("");
    setCustomerName("");
    setCustomerPhone("");
    setDate(defaultDate);
    setTime("");
    setComment("");
    setErrorMessage("");
  }, [isOpen, defaultDate, preselectedBarberId, barbers]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Si cambia el barbero, reseteamos el servicio elegido (son por barbero).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setServiceId("");
  }, [barberId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Escape cierra.
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedService = servicesForBarber.find((s) => s.id === serviceId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const barber = barbers.find((b) => b.id === barberId);
    const service = servicesForBarber.find((s) => s.id === serviceId);

    if (!barber) {
      setErrorMessage("Elegí un barbero.");
      return;
    }
    if (!service) {
      setErrorMessage("Elegí un servicio.");
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage("Poné el nombre del cliente.");
      return;
    }
    if (!date || !time) {
      setErrorMessage("Completá fecha y horario.");
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    const timeNormalized = time.length === 5 ? `${time}:00` : time;

    try {
      const { data, error } = await createPendingAppointment(
        {
          barbershop_slug: barbershopSlug,
          barber_id: barber.id,
          barber_name: barber.display_name || barber.name,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: null,
          service_name: service.name,
          service_price: service.price,
          service_duration_minutes: service.duration_minutes,
          appointment_date: date,
          appointment_time: timeNormalized,
          comment: comment.trim(),
        },
        // El barbero lo agrega a mano: entra confirmado directamente.
        { autoConfirm: true },
      );

      if (error || !data?.id) {
        // 23505 = unique violation → ya hay un turno en ese horario.
        setErrorMessage(
          error?.code === "23505"
            ? "Ya hay un turno en ese horario con ese barbero."
            : "No pudimos crear el turno. Probá de nuevo.",
        );
        return;
      }

      onCreated();
      onClose();
    } catch {
      setErrorMessage("No pudimos crear el turno.");
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "mt-1.5 min-h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Agregar turno fuera de horario"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] shadow-2xl sm:rounded-[var(--radius-lg)]">
        <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
              Turno fuera de horario
            </p>
            <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
              Encajá un corte antes o después de tu horario, sin tocar la agenda.
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

        <form onSubmit={handleSubmit} className="space-y-3 p-5">
          {/* Barbero */}
          <div>
            <label htmlFor="manual-barber" className={labelClass}>
              Barbero
            </label>
            <select
              id="manual-barber"
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
              disabled={isSaving}
              className={inputClass}
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.display_name || b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Servicio */}
          <div>
            <label htmlFor="manual-service" className={labelClass}>
              Servicio
            </label>
            <select
              id="manual-service"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              disabled={isSaving || servicesForBarber.length === 0}
              className={inputClass}
            >
              <option value="">
                {servicesForBarber.length === 0
                  ? "Este barbero no tiene servicios"
                  : "Elegí un servicio"}
              </option>
              {servicesForBarber.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {formatPrice(s.price)} · {s.duration_minutes} min
                </option>
              ))}
            </select>
          </div>

          {/* Cliente */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="manual-name" className={labelClass}>
                Cliente
              </label>
              <input
                id="manual-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={isSaving}
                placeholder="Nombre"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="manual-phone" className={labelClass}>
                Teléfono (opcional)
              </label>
              <input
                id="manual-phone"
                type="tel"
                inputMode="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                disabled={isSaving}
                placeholder="11..."
                className={inputClass}
              />
            </div>
          </div>

          {/* Fecha + horario */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="manual-date" className={labelClass}>
                Fecha
              </label>
              <input
                id="manual-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isSaving}
                className={inputClass}
                required
              />
              {date ? (
                <p className="mt-1 text-[11px] font-medium capitalize text-[color:var(--brand-gold)]">
                  {formatDateWithWeekday(date)}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="manual-time" className={labelClass}>
                Horario
              </label>
              <input
                id="manual-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={isSaving}
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Comentario */}
          <div>
            <label htmlFor="manual-comment" className={labelClass}>
              Comentario (opcional)
            </label>
            <input
              id="manual-comment"
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSaving}
              placeholder="Ej: cliente fijo, vino sin turno…"
              className={inputClass}
            />
          </div>

          {/* Aviso fuera de horario */}
          <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/25 bg-[color:var(--brand-gold-soft)] px-3 py-2.5">
            <Clock
              className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-gold)]"
              aria-hidden="true"
            />
            <p className="text-[11px] leading-4 text-[color:var(--text-secondary)]">
              Podés poner cualquier hora, incluso fuera de tu horario. Si queda
              afuera, el turnero te avisa para extender el horario ese día.
            </p>
          </div>

          {selectedService ? (
            <p className="text-[11px] text-[color:var(--text-subtle)]">
              {selectedService.name} · {formatPrice(selectedService.price)} ·{" "}
              {selectedService.duration_minutes} min
            </p>
          ) : null}

          {errorMessage ? (
            <p
              role="alert"
              className="border-l-2 border-[color:var(--danger)] pl-3 text-sm font-semibold text-[color:var(--danger)]"
            >
              {errorMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className={cn(
                "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-gold-grad px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              <CalendarPlus className="size-3.5" />
              {isSaving ? "Creando…" : "Crear turno"}
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
  );
}
