"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Clock, X, Zap } from "lucide-react";
import { useConfirm } from "@/components/ui";
import { pisaAOtro } from "@/lib/agenda-layout";
import { createPendingAppointment } from "@/lib/appointments";
import { cn } from "@/lib/cn";
import {
  formatDateWithWeekday,
  formatPrice,
  normalizeDateValue,
  timeValueToMinutes,
} from "@/lib/format";
import type { AppointmentRow, BarberRow, BarberServiceRow } from "@/lib/supabase";

type AltaMode = "turno" | "sobreturno";

/** Duraciones que se ofrecen para un sobreturno (minutos). */
const DURACIONES_SOBRETURNO = [10, 15, 20, 30] as const;

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
  /** Hora pre-cargada (HH:MM) cuando se abre desde un hueco del calendario. */
  defaultTime?: string;
  /** "sobreturno": turno corto metido a propósito en un hueco o encima de otro. */
  mode?: AltaMode;
  /** Turnos ya cargados, para avisar si el nuevo pisa a otro. */
  existingAppointments?: AppointmentRow[];
  onClose: () => void;
  onCreated: (mode: AltaMode) => void;
};

/**
 * Modal para que el barbero agregue un turno MANUAL a cualquier hora: dentro
 * de su horario de atención o fuera de él. El campo de hora es libre y no se
 * valida contra el horario laboral — si el turno cae antes de abrir o después
 * de cerrar, igual se crea y en el turnero aparece la advertencia de "fuera de
 * horario" que ya existe.
 *
 * **El turno entra SIEMPRE pendiente**, incluso en barberías con la
 * auto-confirmación prendida. Es a propósito y es distinto de una reserva
 * pública: acá el turno lo carga el barbero *antes* de hablar con el cliente
 * —se lo anota al pasar, lo agenda de memoria— así que darlo por confirmado
 * sería afirmar algo que todavía no pasó. La auto-confirmación existe para las
 * reservas que hace el cliente, que sí son una confirmación de su parte.
 *
 * El teléfono es **opcional**. Sin número no se le puede escribir por WhatsApp
 * para confirmarle, pero el barbero igual puede confirmar el turno a mano desde
 * el turnero — y el caso real de "se me sentó uno sin turno y no le voy a pedir
 * el celular" es más común que el de anotarlo para avisarle después. El turnero
 * ya contempla el turno sin teléfono: no muestra el chip ni arma el link de
 * WhatsApp.
 *
 * Cubre tanto "encajar un corte fuera del horario" como "cargar a mano un
 * turno de alguien que vino sin reservar por la app".
 */
export function ManualAppointmentModal({
  isOpen,
  barbershopSlug,
  barbers,
  services,
  defaultDate,
  preselectedBarberId,
  defaultTime,
  mode = "turno",
  existingAppointments = [],
  onClose,
  onCreated,
}: ManualAppointmentModalProps) {
  const confirm = useConfirm();
  const [kind, setKind] = useState<AltaMode>(mode);
  const [sobreDuration, setSobreDuration] = useState<number>(15);
  const [sobrePrice, setSobrePrice] = useState("");
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
    setTime(defaultTime ?? "");
    setComment("");
    setErrorMessage("");
    setKind(mode);
    setSobreDuration(15);
    setSobrePrice("");
  }, [isOpen, defaultDate, defaultTime, mode, preselectedBarberId, barbers]);
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
    const esSobreturno = kind === "sobreturno";
    // En un sobreturno el servicio es opcional: "le corto la barba en 10" no
    // siempre coincide con un servicio cargado.
    if (!service && !esSobreturno) {
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

    const duracion = esSobreturno ? sobreDuration : (service?.duration_minutes ?? 0);

    // ¿Pisa a otro turno activo del mismo barbero ese día? Se puede (a veces
    // es justo lo que se quiere), pero que sea a sabiendas.
    const otros = existingAppointments
      .filter(
        (a) =>
          a.barber_id === barber.id &&
          normalizeDateValue(a.appointment_date) === date &&
          (a.status === "pending" || a.status === "confirmed"),
      )
      .map((a) => ({
        inicioMin: timeValueToMinutes(a.appointment_time),
        duracionMin: a.actual_duration_minutes ?? a.service_duration_minutes ?? 0,
        nombre: a.customer_name,
        hora: a.appointment_time.slice(0, 5),
      }));
    const nuevo = { inicioMin: timeValueToMinutes(time), duracionMin: duracion };
    if (pisaAOtro(nuevo, otros)) {
      const pisado = otros.find((o) => pisaAOtro(nuevo, [o]));
      const ok = await confirm({
        title: "Se va a encimar con otro turno",
        message: pisado
          ? `A esa hora ${barber.display_name || barber.name} ya tiene a ${pisado.nombre} (${pisado.hora}). ¿Lo cargás igual?`
          : "A esa hora ya hay otro turno. ¿Lo cargás igual?",
        confirmLabel: "Cargar igual",
        cancelLabel: "Volver",
      });
      if (!ok) return;
    }

    setErrorMessage("");
    setIsSaving(true);

    const timeNormalized = time.length === 5 ? `${time}:00` : time;
    const precioSobre = Number(sobrePrice.replace(/\./g, "").replace(",", "."));

    try {
      const { data, error } = await createPendingAppointment(
        {
          barbershop_slug: barbershopSlug,
          barber_id: barber.id,
          barber_name: barber.display_name || barber.name,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: null,
          service_name: service?.name ?? "Sobreturno",
          service_price: service
            ? service.price
            : Number.isFinite(precioSobre)
              ? precioSobre
              : 0,
          // En un sobreturno manda la duración elegida, no la del servicio.
          service_duration_minutes: duracion,
          ...(esSobreturno ? { is_sobreturno: true } : {}),
          appointment_date: date,
          appointment_time: timeNormalized,
          comment: comment.trim(),
        },
        // El barbero lo agrega a mano: entra confirmado directamente.
        // Sin `autoConfirm`: el turno manual queda pendiente SIEMPRE, aunque la
        // barbería tenga la auto-confirmación prendida (ver el comentario de
        // arriba). No es un descuido.
        undefined,
      );

      if (error || !data?.id) {
        // 23505 = unique violation → ya hay un turno en ese horario.
        setErrorMessage(
          error?.code === "23505"
            ? "Ya hay un turno a esa misma hora con ese barbero. Si querés meterlo igual, cargalo como sobreturno."
            : "No pudimos crear el turno. Probá de nuevo.",
        );
        return;
      }

      onCreated(kind);
      onClose();
    } catch {
      setErrorMessage("No pudimos crear el turno.");
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "mt-1.5 min-h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-base text-white outline-none focus:border-[color:var(--brand-gold)] sm:text-sm";
  const labelClass =
    "text-xs font-semibold text-[color:var(--text-secondary)]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={kind === "sobreturno" ? "Agregar sobreturno" : "Agregar turno"}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] shadow-2xl sm:rounded-[var(--radius-lg)]">
        <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] px-5 py-4">
          <div>
            <p className="text-sm font-bold text-[color:var(--brand-gold)]">
              {kind === "sobreturno" ? "Agregar sobreturno" : "Agregar turno"}
            </p>
            <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
              {kind === "sobreturno"
                ? "Un corte corto metido en un rato libre o encima de otro turno."
                : "Cargá un turno a mano, en tu horario o fuera de él."}
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
          {/* Tipo: turno común o sobreturno */}
          <div
            role="radiogroup"
            aria-label="Tipo de turno"
            className="grid grid-cols-2 gap-1 rounded-[var(--radius-md)] border border-[color:var(--border-default)] p-1"
          >
            {(
              [
                { value: "turno", label: "Turno" },
                { value: "sobreturno", label: "Sobreturno" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={kind === opt.value}
                onClick={() => setKind(opt.value)}
                disabled={isSaving}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] text-sm font-semibold transition-colors",
                  kind === opt.value
                    ? "bg-[color:var(--brand-gold-soft)] text-white ring-1 ring-[color:var(--brand-gold)]"
                    : "text-[color:var(--text-secondary)] hover:text-white",
                )}
              >
                {opt.value === "sobreturno" ? (
                  <Zap className="size-4 fill-current text-[color:var(--brand-gold)]" aria-hidden="true" />
                ) : null}
                {opt.label}
              </button>
            ))}
          </div>

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
                {kind === "sobreturno"
                  ? "Sin servicio (sobreturno)"
                  : servicesForBarber.length === 0
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

          {kind === "sobreturno" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={labelClass} id="manual-sobre-duration">
                  Duración
                </p>
                <div
                  role="radiogroup"
                  aria-labelledby="manual-sobre-duration"
                  className="mt-1.5 grid grid-cols-4 gap-1"
                >
                  {DURACIONES_SOBRETURNO.map((min) => (
                    <button
                      key={min}
                      type="button"
                      role="radio"
                      aria-checked={sobreDuration === min}
                      onClick={() => setSobreDuration(min)}
                      disabled={isSaving}
                      className={cn(
                        "min-h-11 rounded-[var(--radius-sm)] border text-sm font-semibold tabular-nums",
                        sobreDuration === min
                          ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] text-white"
                          : "border-[color:var(--border-default)] text-[color:var(--text-secondary)]",
                      )}
                    >
                      {min}
                    </button>
                  ))}
                </div>
              </div>
              {!serviceId ? (
                <div>
                  <label htmlFor="manual-sobre-price" className={labelClass}>
                    Precio (opcional)
                  </label>
                  <input
                    id="manual-sobre-price"
                    type="text"
                    inputMode="decimal"
                    value={sobrePrice}
                    onChange={(e) => setSobrePrice(e.target.value)}
                    disabled={isSaving}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

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
              {isSaving
                ? "Creando…"
                : kind === "sobreturno"
                  ? "Crear sobreturno"
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
  );
}
