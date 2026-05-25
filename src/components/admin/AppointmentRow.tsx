"use client";

import { Check, MessageCircle, Phone, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import type { AppointmentRow as AppointmentData } from "@/lib/supabase";
import { normalizeTimeShort } from "./date-utils";

type ActionHandlers = {
  onConfirm?: (appointment: AppointmentData) => void;
  onWhatsApp?: (appointment: AppointmentData) => void;
  onCancel?: (appointment: AppointmentData) => void;
  onRestore?: (appointment: AppointmentData) => void;
  onDelete?: (appointment: AppointmentData) => void;
};

type PendingState = {
  confirmingId?: string | null;
  cancellingId?: string | null;
  restoringId?: string | null;
  deletingId?: string | null;
};

type AppointmentRowProps = ActionHandlers &
  PendingState & {
    appointment: AppointmentData;
  };

type StatusMeta = {
  label: string;
  pillClasses: string;
  barClasses: string;
};

function getStatusMeta(status: string): StatusMeta {
  switch (status) {
    case "confirmed":
      return {
        label: "Confirmado",
        pillClasses:
          "border-[color:var(--success)]/40 text-[color:var(--success)]",
        barClasses: "bg-[color:var(--success)]",
      };
    case "cancelled":
      return {
        label: "Cancelado",
        pillClasses:
          "border-[color:var(--danger)]/40 text-[color:var(--danger)]",
        barClasses: "bg-[color:var(--danger)]",
      };
    case "deleted":
      return {
        label: "Eliminado",
        pillClasses:
          "border-[color:var(--border-subtle)] text-[color:var(--text-subtle)]",
        barClasses: "bg-[color:var(--border-strong)]",
      };
    default:
      return {
        label: "Pendiente",
        pillClasses:
          "border-[color:var(--brand-gold)]/40 text-[color:var(--brand-gold)]",
        barClasses: "bg-[color:var(--brand-gold)]",
      };
  }
}

export function AppointmentRow({
  appointment,
  onConfirm,
  onWhatsApp,
  onCancel,
  onRestore,
  onDelete,
  confirmingId,
  cancellingId,
  restoringId,
  deletingId,
}: AppointmentRowProps) {
  const status = appointment.status ?? "pending";
  const meta = getStatusMeta(status);
  const isConfirmed = status === "confirmed";
  const isCancelled = status === "cancelled";
  const isDeleted = status === "deleted";
  const isBusy =
    confirmingId === appointment.id ||
    cancellingId === appointment.id ||
    restoringId === appointment.id ||
    deletingId === appointment.id;

  return (
    <li className="group rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--border-default)]">
      <div className="flex items-stretch gap-3 p-3 sm:gap-4 sm:p-4">
        {/* Hora — columna fija a la izquierda */}
        <div className="flex w-14 shrink-0 flex-col items-start justify-center sm:w-16">
          <span className="font-mono text-lg font-black tabular-nums leading-none text-white sm:text-xl">
            {normalizeTimeShort(appointment.appointment_time)}
          </span>
          <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--text-subtle)] sm:text-[10px]">
            {appointment.service_duration_minutes} min
          </span>
        </div>

        {/* Barra vertical de status */}
        <div
          className={cn("w-[3px] shrink-0 rounded-full", meta.barClasses)}
          aria-hidden="true"
        />

        {/* Info principal */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="truncate text-sm font-bold text-white sm:text-base">
              {appointment.customer_name}
            </p>
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-[var(--radius-xs)] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]",
                meta.pillClasses,
              )}
            >
              {meta.label}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-[color:var(--text-secondary)] sm:text-sm">
            {appointment.service_name}
            <span className="mx-1.5 text-[color:var(--text-subtle)]">·</span>
            <span className="font-mono font-bold text-[color:var(--brand-gold)]">
              {formatPrice(appointment.service_price)}
            </span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-[color:var(--text-muted)] sm:text-xs">
            <span className="truncate">{appointment.barber_name}</span>
            {appointment.customer_phone ? (
              <span className="inline-flex items-center gap-1 truncate font-mono">
                <Phone className="size-3" aria-hidden="true" />
                {appointment.customer_phone}
              </span>
            ) : null}
          </div>
          {appointment.comment ? (
            <p className="mt-2 line-clamp-2 rounded-[var(--radius-xs)] border-l border-[color:var(--border-subtle)] pl-2 text-[11px] italic text-[color:var(--text-muted)] sm:text-xs">
              {appointment.comment}
            </p>
          ) : null}
        </div>
      </div>

      {/* Acciones */}
      {isDeleted ? (
        <div className="grid border-t border-[color:var(--border-subtle)]">
          <ActionButton
            onClick={() => onRestore?.(appointment)}
            disabled={isBusy}
            tone="accent"
            icon={<RotateCcw className="size-3.5" />}
          >
            {restoringId === appointment.id ? "Restaurando…" : "Restaurar"}
          </ActionButton>
        </div>
      ) : (
        <div className="grid grid-cols-3 border-t border-[color:var(--border-subtle)] divide-x divide-[color:var(--border-subtle)]">
          <ActionButton
            onClick={() => onConfirm?.(appointment)}
            disabled={isConfirmed || isCancelled || isBusy}
            tone="accent"
            icon={<Check className="size-3.5" />}
          >
            {confirmingId === appointment.id
              ? "…"
              : isConfirmed
                ? "Confirmado"
                : "Confirmar"}
          </ActionButton>
          <ActionButton
            onClick={() => onWhatsApp?.(appointment)}
            disabled={isCancelled || isBusy}
            tone="success"
            icon={<MessageCircle className="size-3.5" />}
          >
            WhatsApp
          </ActionButton>
          <ActionButton
            onClick={() => onCancel?.(appointment)}
            disabled={isCancelled || isBusy}
            tone="danger"
            icon={<X className="size-3.5" />}
          >
            {cancellingId === appointment.id
              ? "…"
              : isCancelled
                ? "Cancelado"
                : "Cancelar"}
          </ActionButton>
        </div>
      )}

      {/* Eliminar definitivamente (solo si está cancelado y onDelete está dado) */}
      {isCancelled && onDelete ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onDelete(appointment)}
          className="w-full border-t border-[color:var(--border-subtle)] py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--danger)] disabled:opacity-40"
        >
          {deletingId === appointment.id ? "Eliminando…" : "Eliminar de la vista"}
        </button>
      ) : null}
    </li>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  tone,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone: "accent" | "success" | "danger";
  icon: React.ReactNode;
}) {
  const toneClass = {
    accent:
      "text-[color:var(--brand-gold)] hover:bg-[color:var(--brand-gold-soft)] disabled:text-[color:var(--text-subtle)]",
    success:
      "text-[color:var(--success)] hover:bg-[color:var(--success-soft)] disabled:text-[color:var(--text-subtle)]",
    danger:
      "text-[color:var(--danger)] hover:bg-[color:var(--danger-soft)] disabled:text-[color:var(--text-subtle)]",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors duration-[var(--duration-fast)] disabled:cursor-not-allowed disabled:hover:bg-transparent",
        toneClass,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}
