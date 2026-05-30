"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Copy,
  MessageCircle,
  MoreVertical,
  Pencil,
  Phone,
  RotateCcw,
  Star,
  StickyNote,
  TimerReset,
  X,
} from "lucide-react";
import {
  getTagTone,
  tagClassesFor,
} from "@/components/admin/ClientTagsEditor";
import { cn } from "@/lib/cn";
import { formatPrice, normalizeDateValue } from "@/lib/format";
import type { AppointmentRow as AppointmentData } from "@/lib/supabase";
import { formatDayHeading, normalizeTimeShort, timeToMinutes } from "./date-utils";

type ActionHandlers = {
  onConfirm?: (appointment: AppointmentData) => void;
  onWhatsApp?: (appointment: AppointmentData) => void;
  onCancel?: (appointment: AppointmentData) => void;
  onRestore?: (appointment: AppointmentData) => void;
  onDelete?: (appointment: AppointmentData) => void;
  onHardDelete?: (appointment: AppointmentData) => void;
  onAdjustActualDuration?: (
    appointment: AppointmentData,
    nextDurationMinutes: number | null,
  ) => void;
  /** Guarda las notas internas del turno. Resuelve con éxito o lanza. */
  onSaveInternalNotes?: (
    appointment: AppointmentData,
    nextNotes: string,
  ) => Promise<void>;
  onDuplicate?: (appointment: AppointmentData) => void;
};

type PendingState = {
  confirmingId?: string | null;
  cancellingId?: string | null;
  restoringId?: string | null;
  deletingId?: string | null;
  hardDeletingId?: string | null;
  updatingDurationId?: string | null;
};

type AppointmentRowProps = ActionHandlers &
  PendingState & {
    appointment: AppointmentData;
    dayClosingMinutes?: number;
    overtimeAccepted?: boolean;
    onAcceptOvertime?: () => void;
    scheduleProjection?: {
      effectiveDurationMinutes: number;
      estimatedStartMinutes: number;
      estimatedEndMinutes: number;
      delayMinutes: number;
    };
    showDate?: boolean;
    /** Tags del cliente (si están cargados). Se muestran al lado del nombre. */
    clientTags?: string[];
    /**
     * Si está presente, se muestra el botón "Pedir reseña" debajo de las
     * acciones. Solo aplica a turnos confirmed/pending cuya fecha ya pasó.
     */
    reviewWhatsAppHref?: string;
    /**
     * Si está presente (turno con delay > 0), se muestra el botón
     * "Avisar delay por WhatsApp" en rojo.
     */
    delayWhatsAppHref?: string;
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

function formatMinutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}`;
}

export function AppointmentRow({
  appointment,
  onConfirm,
  onWhatsApp,
  onCancel,
  onRestore,
  onDelete,
  onHardDelete,
  onAdjustActualDuration,
  onSaveInternalNotes,
  onDuplicate,
  confirmingId,
  cancellingId,
  restoringId,
  deletingId,
  hardDeletingId,
  updatingDurationId,
  dayClosingMinutes,
  overtimeAccepted,
  onAcceptOvertime,
  scheduleProjection,
  showDate,
  clientTags,
  reviewWhatsAppHref,
  delayWhatsAppHref,
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
    deletingId === appointment.id ||
    hardDeletingId === appointment.id ||
    updatingDurationId === appointment.id;
  const baseDurationMinutes = appointment.service_duration_minutes;
  const actualDurationMinutes = appointment.actual_duration_minutes;
  const effectiveDurationMinutes =
    scheduleProjection?.effectiveDurationMinutes ?? baseDurationMinutes;
  const reservedStartMinutes = timeToMinutes(appointment.appointment_time);
  const estimatedStartMinutes =
    scheduleProjection?.estimatedStartMinutes ?? reservedStartMinutes;
  const estimatedEndMinutes =
    scheduleProjection?.estimatedEndMinutes ??
    reservedStartMinutes + effectiveDurationMinutes;
  const delayMinutes = scheduleProjection?.delayMinutes ?? 0;
  const overtimeMinutes =
    dayClosingMinutes !== undefined
      ? Math.max(0, estimatedEndMinutes - dayClosingMinutes)
      : 0;
  const isOutsideDaySchedule = overtimeMinutes > 0;
  const durationChanged =
    actualDurationMinutes !== null &&
    actualDurationMinutes !== undefined &&
    actualDurationMinutes !== baseDurationMinutes;
  const canAdjustDuration =
    (status === "pending" || status === "confirmed") &&
    Boolean(onAdjustActualDuration);

  return (
    <li className="group relative rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] hover-lift">
      {isDeleted && onHardDelete ? (
        <button
          type="button"
          onClick={() => onHardDelete(appointment)}
          disabled={isBusy}
          aria-label="Eliminar definitivamente"
          title="Eliminar definitivamente"
          className="absolute right-2 top-2 z-10 inline-flex size-7 items-center justify-center rounded-[var(--radius-xs)] text-[color:var(--text-subtle)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--danger-soft)] hover:text-[color:var(--danger)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
      <div className="flex items-stretch gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="flex w-14 shrink-0 flex-col items-start justify-center sm:w-16">
          <span className="font-mono text-lg font-black tabular-nums leading-none text-white sm:text-xl">
            {normalizeTimeShort(appointment.appointment_time)}
          </span>
          <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--text-subtle)] sm:text-[10px]">
            {effectiveDurationMinutes} min
          </span>
        </div>

        <div
          className={cn("w-[3px] shrink-0 rounded-full", meta.barClasses)}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="truncate text-sm font-bold text-white sm:text-base">
                {appointment.customer_name}
              </p>
              {clientTags?.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-[var(--radius-xs)] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]",
                    tagClassesFor(getTagTone(tag)),
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {isDeleted && onHardDelete ? null : (
                <span
                  className={cn(
                    "inline-flex items-center rounded-[var(--radius-xs)] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]",
                    meta.pillClasses,
                  )}
                >
                  {meta.label}
                </span>
              )}
              {!isDeleted &&
              !isCancelled &&
              (delayWhatsAppHref || reviewWhatsAppHref || onDuplicate) ? (
                <KebabMenu
                  appointment={appointment}
                  delayWhatsAppHref={delayWhatsAppHref}
                  reviewWhatsAppHref={reviewWhatsAppHref}
                  onDuplicate={onDuplicate}
                  disabled={isBusy}
                />
              ) : null}
            </div>
          </div>
          <p className="mt-1 truncate text-xs text-[color:var(--text-secondary)] sm:text-sm">
            {appointment.service_name}
            <span className="mx-1.5 text-[color:var(--text-subtle)]">·</span>
            <span className="font-mono font-bold text-[color:var(--brand-gold)]">
              {formatPrice(appointment.service_price)}
            </span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-[color:var(--text-muted)] sm:text-xs">
            {showDate ? (
              <span className="inline-flex items-center gap-1 truncate text-[color:var(--brand-gold)]">
                <CalendarDays className="size-3" aria-hidden="true" />
                {formatDayHeading(normalizeDateValue(appointment.appointment_date))}
              </span>
            ) : null}
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

          {onSaveInternalNotes ? (
            <InternalNotesField
              appointment={appointment}
              onSave={onSaveInternalNotes}
              disabled={isBusy}
            />
          ) : null}

          {/* Fila consolidada: Duración + Agenda estimada + Pills de ajuste */}
          <div className="mt-3 rounded-[var(--radius-xs)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]/60 px-2.5 py-2">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--text-secondary)]">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="size-3 text-[color:var(--text-subtle)]" aria-hidden="true" />
                  <span className="font-mono">
                    {formatMinutesToTime(estimatedStartMinutes)}–{formatMinutesToTime(estimatedEndMinutes)}
                  </span>
                </span>
                <span className="text-[color:var(--text-subtle)]">·</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  {baseDurationMinutes}min base
                </span>
                {durationChanged ? (
                  <span className="rounded-[var(--radius-xs)] border border-[color:var(--brand-gold)]/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[color:var(--brand-gold)]">
                    Real {actualDurationMinutes}
                  </span>
                ) : null}
                {isOutsideDaySchedule ? (
                  <span className="rounded-[var(--radius-xs)] border border-[color:var(--danger)]/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[color:var(--danger)]">
                    +{overtimeMinutes}min fuera
                  </span>
                ) : delayMinutes > 0 ? (
                  <span className="rounded-[var(--radius-xs)] border border-[color:var(--danger)]/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[color:var(--danger)]">
                    +{delayMinutes}min
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--success)]">
                    en horario
                  </span>
                )}
              </div>

              {canAdjustDuration ? (
                <div className="flex shrink-0 items-center gap-1">
                  <DurationPill
                    label="-5"
                    onClick={() =>
                      onAdjustActualDuration?.(
                        appointment,
                        Math.max(5, effectiveDurationMinutes - 5),
                      )
                    }
                    disabled={isBusy}
                  />
                  <DurationPill
                    label="+5"
                    accent
                    onClick={() =>
                      onAdjustActualDuration?.(
                        appointment,
                        effectiveDurationMinutes + 5,
                      )
                    }
                    disabled={isBusy}
                  />
                  <DurationPill
                    label="+10"
                    accent
                    onClick={() =>
                      onAdjustActualDuration?.(
                        appointment,
                        effectiveDurationMinutes + 10,
                      )
                    }
                    disabled={isBusy}
                  />
                  <DurationPill
                    icon={<TimerReset className="size-3" aria-hidden="true" />}
                    label="reset"
                    iconOnly
                    onClick={() => onAdjustActualDuration?.(appointment, null)}
                    disabled={isBusy || !durationChanged}
                  />
                </div>
              ) : null}
            </div>
            {isOutsideDaySchedule && onAcceptOvertime ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[color:var(--border-subtle)] pt-2">
                <span className="text-[10px] text-[color:var(--text-muted)]">
                  Termina despues del cierre del dia.
                </span>
                <button
                  type="button"
                  onClick={onAcceptOvertime}
                  disabled={overtimeAccepted}
                  className={cn(
                    "inline-flex min-h-7 items-center justify-center rounded-[var(--radius-xs)] border px-2.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors duration-[var(--duration-fast)] press-shrink disabled:cursor-not-allowed disabled:opacity-70",
                    overtimeAccepted
                      ? "border-[color:var(--success)]/30 text-[color:var(--success)]"
                      : "border-[color:var(--border-default)] text-[color:var(--text-secondary)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]",
                  )}
                >
                  {overtimeAccepted
                    ? `Aceptado +${overtimeMinutes} min`
                    : `Aceptar +${overtimeMinutes} min`}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isDeleted ? (
        <div className="grid border-t border-[color:var(--border-subtle)]">
          <ActionButton
            onClick={() => onRestore?.(appointment)}
            disabled={isBusy}
            tone="accent"
            icon={<RotateCcw className="size-3.5" />}
          >
            {restoringId === appointment.id ? "Restaurando..." : "Restaurar"}
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
              ? "..."
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
              ? "..."
              : isCancelled
                ? "Cancelado"
                : "Cancelar"}
          </ActionButton>
        </div>
      )}

      {isCancelled && onDelete ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onDelete(appointment)}
          className="w-full border-t border-[color:var(--border-subtle)] py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--danger)] disabled:opacity-40"
        >
          {deletingId === appointment.id ? "Eliminando..." : "Eliminar de la vista"}
        </button>
      ) : null}

    </li>
  );
}

/* ──────────────────────────────────────────────────────────── */

function DurationPill({
  label,
  icon,
  iconOnly,
  accent,
  onClick,
  disabled,
}: {
  label: string;
  icon?: React.ReactNode;
  iconOnly?: boolean;
  accent?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded-[var(--radius-xs)] border font-mono text-[10px] font-bold transition-colors duration-[var(--duration-fast)] press-shrink disabled:cursor-not-allowed disabled:opacity-40",
        accent
          ? "border-[color:var(--brand-gold)]/30 text-[color:var(--brand-gold)] hover:bg-[color:var(--brand-gold-soft)]"
          : "border-[color:var(--border-default)] text-[color:var(--text-secondary)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]",
        iconOnly ? "px-1.5" : "px-2",
      )}
    >
      {icon ?? label}
    </button>
  );
}

function KebabMenu({
  appointment,
  delayWhatsAppHref,
  reviewWhatsAppHref,
  onDuplicate,
  disabled,
}: {
  appointment: AppointmentData;
  delayWhatsAppHref?: string;
  reviewWhatsAppHref?: string;
  onDuplicate?: (appointment: AppointmentData) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const hasUrgent = Boolean(delayWhatsAppHref);
  const itemCount =
    Number(Boolean(delayWhatsAppHref)) +
    Number(Boolean(reviewWhatsAppHref)) +
    Number(Boolean(onDuplicate));

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        disabled={disabled}
        aria-label={`Más acciones (${itemCount})`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Más acciones"
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] border transition-all duration-[var(--duration-fast)] press-shrink disabled:cursor-not-allowed disabled:opacity-40",
          isOpen
            ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
            : "border-[color:var(--border-default)] bg-[color:var(--surface-1)] text-[color:var(--brand-gold)]/80 hover:border-[color:var(--brand-gold)] hover:bg-[color:var(--brand-gold-soft)] hover:text-[color:var(--brand-gold)]",
        )}
      >
        <MoreVertical className="size-4" aria-hidden="true" />
        {hasUrgent && !isOpen ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[color:var(--danger)] ring-2 ring-[color:var(--surface-1)] animate-pulse-ring"
          />
        ) : null}
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1.5 w-56 origin-top-right animate-scale-in overflow-hidden rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] shadow-2xl"
        >
          {delayWhatsAppHref ? (
            <a
              role="menuitem"
              href={delayWhatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-[color:var(--danger)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--danger-soft)]"
            >
              <MessageCircle className="size-3.5 shrink-0" aria-hidden="true" />
              Avisar delay
            </a>
          ) : null}
          {reviewWhatsAppHref ? (
            <a
              role="menuitem"
              href={reviewWhatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-[color:var(--brand-gold)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-soft)]"
            >
              <Star className="size-3.5 shrink-0" aria-hidden="true" />
              Pedir reseña
            </a>
          ) : null}
          {onDuplicate ? (
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setIsOpen(false);
                onDuplicate(appointment);
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--surface-2)] hover:text-white"
            >
              <Copy className="size-3.5 shrink-0" aria-hidden="true" />
              Duplicar turno
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
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
  tone: "accent" | "success" | "danger" | "neutral";
  icon: React.ReactNode;
}) {
  const toneClass = {
    accent:
      "text-[color:var(--brand-gold)] hover:bg-[color:var(--brand-gold-soft)] disabled:text-[color:var(--text-subtle)]",
    success:
      "text-[color:var(--success)] hover:bg-[color:var(--success-soft)] disabled:text-[color:var(--text-subtle)]",
    danger:
      "text-[color:var(--danger)] hover:bg-[color:var(--danger-soft)] disabled:text-[color:var(--text-subtle)]",
    neutral:
      "text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-0)] disabled:text-[color:var(--text-subtle)]",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors duration-[var(--duration-fast)] press-shrink disabled:cursor-not-allowed disabled:hover:bg-transparent",
        toneClass,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}

function InternalNotesField({
  appointment,
  onSave,
  disabled,
}: {
  appointment: AppointmentData;
  onSave: (a: AppointmentData, next: string) => Promise<void>;
  disabled?: boolean;
}) {
  const current = appointment.internal_notes ?? "";
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(current);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function startEditing() {
    setDraft(appointment.internal_notes ?? "");
    setErrorMessage("");
    setIsEditing(true);
  }

  function cancel() {
    setDraft(appointment.internal_notes ?? "");
    setErrorMessage("");
    setIsEditing(false);
  }

  async function save() {
    setErrorMessage("");
    setIsSaving(true);
    try {
      await onSave(appointment, draft);
      setIsEditing(false);
    } catch {
      setErrorMessage("No pudimos guardar.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isEditing) {
    if (!current) {
      return (
        <button
          type="button"
          onClick={startEditing}
          disabled={disabled}
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-subtle)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <StickyNote className="size-3" aria-hidden="true" />+ Nota interna
        </button>
      );
    }
    return (
      <div className="mt-2 rounded-[var(--radius-xs)] border border-[color:var(--brand-gold)]/20 bg-[color:var(--brand-gold-soft)] px-2.5 py-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-1.5">
            <StickyNote
              className="mt-0.5 size-3 shrink-0 text-[color:var(--brand-gold)]"
              aria-hidden="true"
            />
            <p className="text-[11px] text-[color:var(--text-secondary)] sm:text-xs">
              {current}
            </p>
          </div>
          <button
            type="button"
            onClick={startEditing}
            disabled={disabled}
            aria-label="Editar nota"
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-[color:var(--text-subtle)] transition-colors hover:bg-black/20 hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Pencil className="size-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-[var(--radius-xs)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--surface-0)]/80 p-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={isSaving}
        rows={2}
        maxLength={500}
        placeholder="Notas que solo vos ves sobre este turno…"
        autoFocus
        className="w-full resize-none rounded-[var(--radius-xs)] border border-[color:var(--border-default)] bg-black px-2 py-1.5 text-[11px] text-white outline-none placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)] sm:text-xs"
      />
      {errorMessage ? (
        <p
          role="alert"
          className="mt-1 text-[10px] font-semibold text-[color:var(--danger)]"
        >
          {errorMessage}
        </p>
      ) : null}
      <div className="mt-1.5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={isSaving}
          className="rounded-[var(--radius-xs)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-subtle)] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isSaving || draft === current}
          className="rounded-[var(--radius-xs)] bg-[color:var(--brand-gold)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
