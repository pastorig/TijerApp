"use client";

import { useState } from "react";
import { CalendarClock, Check, X } from "lucide-react";
import { Button, useConfirm } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  cancelAppointmentByToken,
  confirmAppointmentByToken,
  type PublicAppointmentByToken,
} from "@/lib/public-appointment";
import {
  formatDateForDisplay,
  formatPrice,
  normalizeTimeValue,
} from "@/lib/format";
import { AppointmentRescheduleDrawer } from "./AppointmentRescheduleDrawer";

type AppointmentActionPanelProps = {
  token: string;
  initialAppointment: PublicAppointmentByToken;
  /**
   * Si true, muestra los botones Confirmar / No puedo asistir (modo activo).
   * Si false, solo muestra el detalle del turno (modo pasivo).
   * Default: true.
   */
  showActions?: boolean;
};

type ActionState = "idle" | "confirming" | "cancelling";

export function AppointmentActionPanel({
  token,
  initialAppointment,
  showActions = true,
}: AppointmentActionPanelProps) {
  const confirm = useConfirm();
  const [appointment, setAppointment] = useState(initialAppointment);
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);

  const status = appointment.status;
  const isPending = status === "pending";
  const isConfirmed = status === "confirmed";
  const isCancelled = status === "cancelled";
  const isFinal = isCancelled || status === "deleted";

  async function handleConfirm() {
    if (!isPending) return;
    setErrorMessage("");
    setActionState("confirming");
    const result = await confirmAppointmentByToken(token);
    if (!result.ok) {
      setErrorMessage(
        result.reason === "not_found"
          ? "No encontramos tu turno. Es posible que el link no sea válido."
          : "No pudimos confirmar tu turno. Intentá nuevamente.",
      );
      setActionState("idle");
      return;
    }
    setAppointment((current) => ({
      ...current,
      status: (result.status as PublicAppointmentByToken["status"]) ?? "confirmed",
    }));
    setActionState("idle");
  }

  async function handleCancel() {
    if (isFinal) return;
    const ok = await confirm({
      title: "Cancelar turno",
      message: "Vas a liberar este horario para otra persona. ¿Estás seguro?",
      confirmLabel: "Sí, cancelar",
      cancelLabel: "Volver",
      danger: true,
    });
    if (!ok) return;
    setErrorMessage("");
    setActionState("cancelling");
    const result = await cancelAppointmentByToken(token);
    if (!result.ok) {
      setErrorMessage(
        result.reason === "not_found"
          ? "No encontramos tu turno. Es posible que el link no sea válido."
          : "No pudimos cancelar tu turno. Intentá nuevamente.",
      );
      setActionState("idle");
      return;
    }
    setAppointment((current) => ({
      ...current,
      status: (result.status as PublicAppointmentByToken["status"]) ?? "cancelled",
    }));
    setActionState("idle");
  }

  // Vista de reagendar (reemplaza el detalle mientras el cliente elige).
  if (isRescheduling) {
    return (
      <article className="animate-fade-up">
        <AppointmentRescheduleDrawer
          token={token}
          currentDate={appointment.appointment_date}
          currentTime={appointment.appointment_time}
          onCancel={() => setIsRescheduling(false)}
          onSuccess={(newDate, newTime) => {
            setAppointment((current) => ({
              ...current,
              appointment_date: newDate,
              appointment_time: newTime,
              status: "pending",
            }));
            setIsRescheduling(false);
            setRescheduleSuccess(true);
          }}
        />
      </article>
    );
  }

  return (
    <article className="animate-fade-up">
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
        Tu turno · {appointment.barbershop_name}
      </p>

      <h1 className="mt-4 text-3xl font-black uppercase leading-[0.95] tracking-tight text-balance break-words sm:text-4xl lg:text-5xl">
        Hola {firstName(appointment.customer_name)}
      </h1>

      {/* Status badge actual */}
      <div className="mt-6">
        <StatusBadge status={status} />
      </div>

      {/* Detalle del turno */}
      <dl className="mt-8 grid gap-4 border-t border-[color:var(--border-subtle)] pt-6">
        <DetailRow
          label="Fecha"
          value={formatDateForDisplay(appointment.appointment_date)}
        />
        <DetailRow
          label="Hora"
          value={normalizeTimeValue(appointment.appointment_time)}
          highlight
        />
        <DetailRow label="Servicio" value={appointment.service_name} />
        <DetailRow
          label="Duración"
          value={`${appointment.service_duration_minutes} min`}
        />
        <DetailRow label="Barbero" value={appointment.barber_name} />
        {appointment.coupon_code && appointment.discount_amount ? (
          <>
            <DetailRow
              label="Precio original"
              value={formatPrice(appointment.service_price)}
              monoValue
              strikethrough
            />
            <DetailRow
              label={`Cupón ${appointment.coupon_code}`}
              value={`-${formatPrice(appointment.discount_amount)}`}
              monoValue
              accent
            />
            <DetailRow
              label="Total a pagar"
              value={formatPrice(appointment.final_price)}
              monoValue
              highlight
            />
          </>
        ) : (
          <DetailRow
            label="Precio"
            value={formatPrice(appointment.service_price)}
            monoValue
            highlight
          />
        )}
        {appointment.comment ? (
          <DetailRow label="Comentario" value={appointment.comment} />
        ) : null}
      </dl>

      {/* Acciones */}
      <div className="mt-10">
        {showActions ? (
          // ── Modo activo: cliente decide (viene del WA del admin) ──
          isPending ? (
            <div className="grid gap-3">
              {rescheduleSuccess ? (
                <p className="border-l-2 border-[color:var(--success)] pl-3 text-sm font-semibold text-[color:var(--success)]">
                  Reagendamos tu turno. Espera la confirmación de{" "}
                  {appointment.barbershop_name}.
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  size="lg"
                  fullWidth
                  loading={actionState === "confirming"}
                  disabled={actionState !== "idle"}
                  onClick={handleConfirm}
                  iconLeft={<Check className="size-4" />}
                >
                  Confirmar turno
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="lg"
                  fullWidth
                  loading={actionState === "cancelling"}
                  disabled={actionState !== "idle"}
                  onClick={handleCancel}
                  iconLeft={<X className="size-4" />}
                >
                  No puedo asistir
                </Button>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                disabled={actionState !== "idle"}
                onClick={() => setIsRescheduling(true)}
                iconLeft={<CalendarClock className="size-4" />}
              >
                Reagendar para otro día
              </Button>
            </div>
          ) : isConfirmed ? (
            <div className="space-y-4">
              <p className="text-sm text-[color:var(--text-secondary)]">
                Gracias por confirmar. Te esperamos en{" "}
                {appointment.barbershop_name}.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={actionState !== "idle"}
                  onClick={() => setIsRescheduling(true)}
                  iconLeft={<CalendarClock className="size-3.5" />}
                >
                  Reagendar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="md"
                  loading={actionState === "cancelling"}
                  disabled={actionState !== "idle"}
                  onClick={handleCancel}
                  iconLeft={<X className="size-3.5" />}
                >
                  Cancelar turno
                </Button>
              </div>
            </div>
          ) : isCancelled ? (
            <p className="text-sm text-[color:var(--text-secondary)]">
              Este turno está cancelado. Si querés reservar otro, podés
              hacerlo desde la página de {appointment.barbershop_name}.
            </p>
          ) : (
            <p className="text-sm text-[color:var(--text-muted)]">
              Este turno ya no está disponible.
            </p>
          )
        ) : (
          // ── Modo pasivo: solo informativo (viene del "Ver mi turno") ──
          <p className="text-sm leading-7 text-[color:var(--text-secondary)]">
            {isPending
              ? `Tu turno está pendiente. Te avisaremos cuando ${appointment.barbershop_name} te lo confirme.`
              : isConfirmed
                ? `Tu turno está confirmado. Te esperamos en ${appointment.barbershop_name}.`
                : isCancelled
                  ? `Este turno está cancelado.`
                  : `Este turno ya no está disponible.`}
          </p>
        )}
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="mt-6 border-l-2 border-[color:var(--danger)] pl-4 text-sm font-semibold text-[color:var(--danger)]"
        >
          {errorMessage}
        </div>
      ) : null}

      {/* Footer */}
      <p className="mt-12 text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-subtle)]">
        Powered by TijerApp
      </p>
    </article>
  );
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function DetailRow({
  label,
  value,
  highlight,
  monoValue,
  strikethrough,
  accent,
}: {
  label: string;
  value: string;
  /** Valor en gold (resalta total final). */
  highlight?: boolean;
  /** Font monospace + tabular-nums (para precios). */
  monoValue?: boolean;
  /** Tachado + muted (para precio original cuando hay descuento). */
  strikethrough?: boolean;
  /** Color gold-soft de acento (para línea del cupón). */
  accent?: boolean;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-baseline gap-4">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
        {label}
      </dt>
      <dd
        className={cn(
          "text-right text-sm font-semibold",
          highlight
            ? "text-[color:var(--brand-gold)]"
            : accent
              ? "text-[color:var(--brand-gold)]/85"
              : strikethrough
                ? "text-[color:var(--text-muted)] line-through"
                : "text-white",
          monoValue && "font-mono tabular-nums",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: PublicAppointmentByToken["status"];
}) {
  const meta = {
    pending: {
      label: "Pendiente de confirmación",
      classes:
        "border-[color:var(--brand-gold)]/40 text-[color:var(--brand-gold)]",
    },
    confirmed: {
      label: "Confirmado",
      classes:
        "border-[color:var(--success)]/40 text-[color:var(--success)]",
    },
    cancelled: {
      label: "Cancelado",
      classes:
        "border-[color:var(--danger)]/40 text-[color:var(--danger)]",
    },
    deleted: {
      label: "Eliminado",
      classes:
        "border-[color:var(--border-subtle)] text-[color:var(--text-subtle)]",
    },
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-xs)] border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]",
        meta.classes,
      )}
    >
      {meta.label}
    </span>
  );
}
