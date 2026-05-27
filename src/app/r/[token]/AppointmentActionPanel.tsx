"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui";
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

type AppointmentActionPanelProps = {
  token: string;
  initialAppointment: PublicAppointmentByToken;
};

type ActionState = "idle" | "confirming" | "cancelling";

export function AppointmentActionPanel({
  token,
  initialAppointment,
}: AppointmentActionPanelProps) {
  const [appointment, setAppointment] = useState(initialAppointment);
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

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
    const ok = window.confirm(
      "¿Confirmás que no vas a poder asistir? Se libera el horario.",
    );
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
        <DetailRow
          label="Precio"
          value={formatPrice(appointment.service_price)}
          monoValue
          highlight
        />
        {appointment.comment ? (
          <DetailRow label="Comentario" value={appointment.comment} />
        ) : null}
      </dl>

      {/* Acciones */}
      <div className="mt-10">
        {isPending ? (
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
        ) : isConfirmed ? (
          <div className="space-y-4">
            <p className="text-sm text-[color:var(--text-secondary)]">
              Gracias por confirmar. Te esperamos en {appointment.barbershop_name}.
            </p>
            <Button
              type="button"
              variant="danger"
              size="md"
              loading={actionState === "cancelling"}
              disabled={actionState !== "idle"}
              onClick={handleCancel}
              iconLeft={<X className="size-3.5" />}
            >
              Cancelar este turno
            </Button>
          </div>
        ) : isCancelled ? (
          <p className="text-sm text-[color:var(--text-secondary)]">
            Este turno está cancelado. Si querés reservar otro, podés hacerlo
            desde la página de {appointment.barbershop_name}.
          </p>
        ) : (
          <p className="text-sm text-[color:var(--text-muted)]">
            Este turno ya no está disponible.
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
        Powered by BarberSync
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
}: {
  label: string;
  value: string;
  highlight?: boolean;
  monoValue?: boolean;
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
