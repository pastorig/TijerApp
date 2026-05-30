"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock3,
  Copy,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Pencil,
  Phone,
  RotateCcw,
  Scissors,
  Star,
  StickyNote,
  TimerReset,
  User,
  X,
} from "lucide-react";
import {
  getTagTone,
  tagClassesFor,
} from "@/components/admin/ClientTagsEditor";
import { cn } from "@/lib/cn";
import { formatPrice, normalizeDateValue } from "@/lib/format";
import type { AppointmentRow as AppointmentData } from "@/lib/supabase";
import {
  getStampParts,
  normalizeTimeShort,
  timeToMinutes,
  toYmd,
} from "./date-utils";

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
    /** Si false, no muestra el bloque de fecha (vista "Día"). Default true. */
    showDate?: boolean;
    clientTags?: string[];
    reviewWhatsAppHref?: string;
    delayWhatsAppHref?: string;
    /** True si este turno es el próximo en empezar (hoy, futuro, más cercano). */
    isNextUp?: boolean;
  };

type StatusMeta = {
  label: string;
  dotColor: string;
  pillClasses: string;
  cardBorderClass: string;
  dotPulse: boolean;
};

function getStatusMeta(status: string): StatusMeta {
  switch (status) {
    case "confirmed":
      return {
        label: "Confirmado",
        dotColor: "bg-[color:var(--success)]",
        pillClasses:
          "border-[color:var(--success)]/40 bg-[color:var(--success-soft)] text-[color:var(--success)]",
        cardBorderClass: "before:bg-[color:var(--success)]/60",
        dotPulse: false,
      };
    case "cancelled":
      return {
        label: "Cancelado",
        dotColor: "bg-[color:var(--danger)]",
        pillClasses:
          "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
        cardBorderClass: "before:bg-[color:var(--danger)]/50",
        dotPulse: false,
      };
    case "deleted":
      return {
        label: "Eliminado",
        dotColor: "bg-[color:var(--text-subtle)]",
        pillClasses:
          "border-[color:var(--border-default)] bg-[color:var(--surface-0)] text-[color:var(--text-muted)]",
        cardBorderClass: "before:bg-[color:var(--border-strong)]",
        dotPulse: false,
      };
    default:
      return {
        label: "Pendiente",
        dotColor: "bg-amber-400",
        pillClasses:
          "border-amber-400/40 bg-amber-400/10 text-amber-300",
        cardBorderClass: "before:bg-amber-400/60",
        dotPulse: true,
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

function pickPrimaryTag(tags?: string[]): string | null {
  if (!tags || tags.length === 0) return null;
  const lower = tags.map((t) => t.toLowerCase());
  const vipIdx = lower.indexOf("vip");
  if (vipIdx !== -1) return tags[vipIdx];
  const habIdx = lower.indexOf("habitual");
  if (habIdx !== -1) return tags[habIdx];
  return tags[0];
}

/**
 * Hook que re-renderiza el componente cada 60 segundos para mantener
 * fresca la información temporal relativa ("empieza en 15 min", etc).
 * Cheap: solo dispara un setState cuando cambia el minuto.
 */
function useTickingMinute() {
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      force((v) => v + 1);
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);
}

type RelativeTimeInfo = {
  text: string;
  tone: "info" | "warning" | "danger" | "neutral";
};

/**
 * Calcula el estado temporal contextual del turno.
 * - Día futuro lejano: null
 * - Día futuro próximo: nada (la fecha lo dice)
 * - Hoy + futuro: "empieza en Xmin" / "en Xh"
 * - Hoy + por empezar pero retrasado: "retrasado +Xmin"
 * - Hoy + en curso: "en curso"
 * - Hoy + ya terminó: "finalizado"
 * - Día pasado: "pasado"
 */
function getRelativeTimeInfo(opts: {
  appointmentDate: string;
  estimatedStartMinutes: number;
  estimatedEndMinutes: number;
  delayMinutes: number;
  status: string;
}): RelativeTimeInfo | null {
  if (opts.status === "cancelled" || opts.status === "deleted") return null;

  const now = new Date();
  const todayIso = toYmd(now);

  if (opts.appointmentDate < todayIso) {
    return { text: "Pasado", tone: "neutral" };
  }

  if (opts.appointmentDate > todayIso) {
    return null; // futuro lejano, ya muestra la fecha
  }

  // Hoy
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (nowMinutes >= opts.estimatedEndMinutes) {
    return { text: "Finalizado", tone: "neutral" };
  }

  if (nowMinutes >= opts.estimatedStartMinutes) {
    return { text: "En curso", tone: "info" };
  }

  if (opts.delayMinutes > 0) {
    return {
      text: `Retrasado +${opts.delayMinutes} min`,
      tone: "warning",
    };
  }

  const minutesUntilStart = opts.estimatedStartMinutes - nowMinutes;
  if (minutesUntilStart <= 60) {
    return {
      text: `Empieza en ${minutesUntilStart} min`,
      tone: minutesUntilStart <= 15 ? "warning" : "info",
    };
  }
  const hours = Math.floor(minutesUntilStart / 60);
  return {
    text: `Empieza en ${hours}h`,
    tone: "info",
  };
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
  showDate = true,
  clientTags,
  reviewWhatsAppHref,
  delayWhatsAppHref,
  isNextUp,
}: AppointmentRowProps) {
  // Tick cada 60s para refrescar relative time
  useTickingMinute();

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

  const primaryTag = pickPrimaryTag(clientTags);
  const ymdDate = normalizeDateValue(appointment.appointment_date);
  const stamp = showDate ? getStampParts(ymdDate) : null;
  const startTimeShort = normalizeTimeShort(appointment.appointment_time);
  const endTimeShort = formatMinutesToTime(
    reservedStartMinutes + effectiveDurationMinutes,
  );
  const estimatedStartShort = formatMinutesToTime(estimatedStartMinutes);
  const estimatedEndShort = formatMinutesToTime(estimatedEndMinutes);
  const phoneDigits = appointment.customer_phone?.replace(/\D+/g, "") ?? "";
  const phoneWaHref = phoneDigits ? `https://wa.me/${phoneDigits}` : null;

  const relTime = getRelativeTimeInfo({
    appointmentDate: ymdDate,
    estimatedStartMinutes,
    estimatedEndMinutes,
    delayMinutes,
    status,
  });

  // Dimming sutil para turnos pasados o finalizados
  const isPast = relTime?.text === "Pasado" || relTime?.text === "Finalizado";

  return (
    <li
      className={cn(
        "group relative overflow-hidden rounded-[var(--radius-md)] border bg-[color:var(--surface-1)] hover-lift transition-opacity",
        // Border-left de color según status — refuerzo visual del estado.
        "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-['']",
        meta.cardBorderClass,
        isNextUp
          ? "border-[color:var(--brand-gold)]/40 ring-1 ring-[color:var(--brand-gold)]/20"
          : "border-[color:var(--border-subtle)]",
        isPast ? "opacity-70" : "",
      )}
    >
      {/* X hard delete absoluta — solo en eliminados */}
      {isDeleted && onHardDelete ? (
        <button
          type="button"
          onClick={() => onHardDelete(appointment)}
          disabled={isBusy}
          aria-label="Eliminar definitivamente"
          title="Eliminar definitivamente"
          className="absolute right-2 top-2 z-10 inline-flex size-7 items-center justify-center rounded-[var(--radius-xs)] text-[color:var(--text-subtle)] transition-colors duration-[var(--duration-fast)] press-shrink hover:bg-[color:var(--danger-soft)] hover:text-[color:var(--danger)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}

      <div className="flex flex-col sm:flex-row">
        {/* ───── ZONA A: Bloque temporal (date + time) ───── */}
        <DateTimeBlock
          stamp={stamp}
          startTime={startTimeShort}
          endTime={endTimeShort}
          durationMinutes={effectiveDurationMinutes}
        />

        {/* ───── ZONA B+C+D+E: Contenido principal ───── */}
        <div className="min-w-0 flex-1 px-4 py-4 sm:px-5 sm:py-5">
          {/* Línea 1: nombre + status (inline desktop) + kebab */}
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              {/* Mobile: name sola, status debajo. Desktop: name + status pill mismo row */}
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                <h3
                  className="truncate text-2xl font-black tracking-tight text-white sm:flex-1 sm:text-3xl"
                  title={appointment.customer_name}
                >
                  {appointment.customer_name}
                </h3>
                {isDeleted && onHardDelete ? null : (
                  <div className="flex shrink-0 items-center">
                    <StatusPill
                      key={status}
                      meta={meta}
                      aria-label={`Estado: ${meta.label}`}
                    />
                  </div>
                )}
              </div>

              {/* Línea 2: tiempo relativo + tag */}
              {relTime || primaryTag ? (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {relTime ? <RelativeTimeChip info={relTime} /> : null}
                  {primaryTag ? (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                        tagClassesFor(getTagTone(primaryTag)),
                      )}
                    >
                      {primaryTag}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center">
              {!isDeleted &&
              !isCancelled &&
              (delayWhatsAppHref ||
                reviewWhatsAppHref ||
                onDuplicate ||
                canAdjustDuration) ? (
                <KebabMenu
                  appointment={appointment}
                  delayWhatsAppHref={delayWhatsAppHref}
                  reviewWhatsAppHref={reviewWhatsAppHref}
                  onDuplicate={onDuplicate}
                  canAdjustDuration={canAdjustDuration}
                  durationChanged={durationChanged}
                  effectiveDurationMinutes={effectiveDurationMinutes}
                  onAdjustActualDuration={onAdjustActualDuration}
                  disabled={isBusy}
                />
              ) : null}
            </div>
          </div>

          {/* Línea 3: servicio + duración (juntos) ── precio (derecha) */}
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 sm:mt-5">
            <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-white sm:text-base">
              <Scissors
                className="size-4 text-[color:var(--text-subtle)]"
                aria-hidden="true"
              />
              {appointment.service_name}
              <span className="text-[color:var(--text-subtle)]">·</span>
              <span className="font-medium text-[color:var(--text-muted)]">
                {baseDurationMinutes} min
              </span>
            </span>
            <span className="font-mono text-lg font-black tabular-nums text-[color:var(--brand-gold)] sm:text-2xl">
              {formatPrice(appointment.service_price)}
            </span>
          </div>

          {/* Línea 4: barbero · teléfono — compacto en una línea */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[13px] text-[color:var(--text-muted)] sm:text-sm">
            <span className="inline-flex items-center gap-1.5">
              <User
                className="size-4 text-[color:var(--text-subtle)]"
                aria-hidden="true"
              />
              {appointment.barber_name}
            </span>
            {appointment.customer_phone ? (
              <>
                <span className="text-[color:var(--text-subtle)]">•</span>
                {phoneWaHref ? (
                  <a
                    href={phoneWaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
                    title="Abrir en WhatsApp"
                  >
                    <Phone
                      className="size-4 text-[color:var(--text-subtle)]"
                      aria-hidden="true"
                    />
                    {appointment.customer_phone}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <Phone
                      className="size-4 text-[color:var(--text-subtle)]"
                      aria-hidden="true"
                    />
                    {appointment.customer_phone}
                  </span>
                )}
              </>
            ) : null}
          </div>

          {/* ───── ZONA F: avisos contextuales ───── */}

          {/* Overtime */}
          {isOutsideDaySchedule ? (
            <div
              role="alert"
              className="mt-4 flex flex-wrap items-start gap-2 rounded-[var(--radius-xs)] border border-amber-400/30 bg-amber-400/[0.06] p-3"
            >
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-amber-300"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300 sm:text-xs">
                  Termina fuera de horario (+{overtimeMinutes} min)
                </p>
                <p className="mt-0.5 text-[11px] text-amber-200/80">
                  Estimado: {estimatedStartShort}–{estimatedEndShort}
                </p>
              </div>
              {onAcceptOvertime ? (
                <button
                  type="button"
                  onClick={onAcceptOvertime}
                  disabled={overtimeAccepted}
                  className={cn(
                    "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-xs)] border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-[var(--duration-fast)] press-shrink disabled:cursor-not-allowed disabled:opacity-70",
                    overtimeAccepted
                      ? "border-amber-400/40 text-amber-300"
                      : "border-amber-400/50 text-amber-300 hover:bg-amber-400/10",
                  )}
                >
                  {overtimeAccepted ? "Aceptado" : "Aceptar"}
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Delay — INDEPENDIENTE de overtime, pueden coexistir */}
          {delayMinutes > 0 ? (
            <div
              role="alert"
              className={cn(
                "flex flex-wrap items-start gap-2 rounded-[var(--radius-xs)] border p-3",
                delayMinutes >= 15
                  ? "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)]/60"
                  : "border-amber-400/30 bg-amber-400/[0.06]",
                // Spacing: si ya hay overtime banner arriba, gap-2; sino mt-4
                isOutsideDaySchedule ? "mt-2" : "mt-4",
              )}
            >
              <Clock3
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  delayMinutes >= 15
                    ? "text-[color:var(--danger)]"
                    : "text-amber-300",
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[11px] font-bold uppercase tracking-[0.14em] sm:text-xs",
                    delayMinutes >= 15
                      ? "text-[color:var(--danger)]"
                      : "text-amber-300",
                  )}
                >
                  Retrasado +{delayMinutes} min
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[11px]",
                    delayMinutes >= 15
                      ? "text-[color:var(--danger)]/80"
                      : "text-amber-200/80",
                  )}
                >
                  Estimado: {estimatedStartShort}–{estimatedEndShort}
                </p>
              </div>
            </div>
          ) : null}

          {/* Duración real diferente */}
          {durationChanged ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)]">
              <Clock3 className="size-3.5" aria-hidden="true" />
              Duración real: {actualDurationMinutes} min (base{" "}
              {baseDurationMinutes})
            </p>
          ) : null}

          {/* Comentario del cliente */}
          {appointment.comment ? (
            <div className="mt-3 flex items-start gap-2 rounded-r-[var(--radius-xs)] border-l-2 border-sky-400/50 bg-sky-400/[0.04] px-3 py-2">
              <MessageSquare
                className="mt-0.5 size-4 shrink-0 text-sky-400"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-sky-300/70">
                  Comentario del cliente
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-[color:var(--text-secondary)] sm:text-sm">
                  {appointment.comment}
                </p>
              </div>
            </div>
          ) : null}

          {/* Nota interna del owner */}
          {onSaveInternalNotes ? (
            <InternalNotesField
              appointment={appointment}
              onSave={onSaveInternalNotes}
              disabled={isBusy}
            />
          ) : null}
        </div>
      </div>

      {/* ───── ZONA G: Footer de acciones — jerarquizado ───── */}
      {isDeleted ? (
        <div className="border-t border-white/[0.04] bg-[color:var(--surface-0)]/40 p-3">
          <button
            type="button"
            onClick={() => onRestore?.(appointment)}
            disabled={isBusy}
            className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--brand-gold)] transition-colors duration-[var(--duration-fast)] press-shrink hover:bg-[color:var(--brand-gold-soft)]/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {restoringId === appointment.id ? "Restaurando..." : "Restaurar turno"}
          </button>
        </div>
      ) : (
        <div className="border-t border-white/[0.04] bg-[color:var(--surface-0)]/40 p-3">
          {/* MOBILE: Confirmar full width arriba, WhatsApp + Cancelar 50/50 abajo */}
          {/* DESKTOP: Confirmar flex-1, WhatsApp + Cancelar inline a la derecha */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {/* PRIMARY: Confirmar */}
            <button
              key={isConfirmed ? "confirmed" : "pending"}
              type="button"
              onClick={() => onConfirm?.(appointment)}
              disabled={isConfirmed || isCancelled || isBusy}
              className={cn(
                "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 text-[12px] font-bold uppercase tracking-[0.16em] transition-all duration-[var(--duration-fast)] press-shrink disabled:cursor-not-allowed sm:min-h-11",
                isConfirmed
                  ? "animate-success-pop border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] text-[color:var(--success)]"
                  : isCancelled
                    ? "border border-white/[0.04] bg-transparent text-[color:var(--text-subtle)] opacity-50"
                    : "bg-[color:var(--brand-gold)] text-black shadow-[0_0_0_0_var(--brand-gold-ring)] hover:bg-[color:var(--brand-gold-hi)] hover:shadow-[0_0_0_3px_var(--brand-gold-ring)]",
              )}
            >
              <Check className="size-5 sm:size-4" aria-hidden="true" />
              {confirmingId === appointment.id
                ? "..."
                : isConfirmed
                  ? "Confirmado"
                  : "Confirmar"}
            </button>

            {/* SECONDARIES: WhatsApp + Cancelar */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
              {/* WhatsApp — filled subtle green, mucho más visible que outline */}
              <button
                type="button"
                onClick={() => onWhatsApp?.(appointment)}
                disabled={isCancelled || isBusy}
                className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--success)] transition-all duration-[var(--duration-fast)] press-shrink hover:border-[color:var(--success)]/60 hover:bg-[color:var(--success)]/20 hover:shadow-[0_0_0_3px_var(--success-soft)] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-11"
              >
                <MessageCircle className="size-5 sm:size-4" aria-hidden="true" />
                WhatsApp
              </button>

              {/* Cancelar — filled soft red, claramente clickeable */}
              <button
                type="button"
                onClick={() => onCancel?.(appointment)}
                disabled={isCancelled || isBusy}
                className={cn(
                  "inline-flex min-h-12 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border px-3 text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-[var(--duration-fast)] press-shrink disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-11",
                  isCancelled
                    ? "animate-success-pop border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] text-[color:var(--danger)]"
                    : "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] text-[color:var(--danger)] hover:border-[color:var(--danger)]/70 hover:bg-[color:var(--danger)]/20 hover:shadow-[0_0_0_3px_var(--danger-soft)]",
                )}
              >
                <X className="size-5 sm:size-4" aria-hidden="true" />
                {cancellingId === appointment.id
                  ? "Cancelando…"
                  : isCancelled
                    ? "Cancelado"
                    : "Cancelar"}
              </button>
            </div>
          </div>

          {/* Eliminar de la vista — solo si cancelado */}
          {isCancelled && onDelete ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onDelete(appointment)}
              className="mt-2 inline-flex w-full items-center justify-center gap-1 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)] transition-colors duration-[var(--duration-fast)] press-shrink hover:text-[color:var(--danger)] disabled:opacity-40"
            >
              {deletingId === appointment.id
                ? "Eliminando..."
                : "Eliminar de la vista"}
            </button>
          ) : null}
        </div>
      )}
    </li>
  );
}

/* ───────────────────────────────────────────────────────── */

function DateTimeBlock({
  stamp,
  startTime,
  endTime,
  durationMinutes,
}: {
  stamp: { weekday: string; day: string; month: string } | null;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}) {
  return (
    <>
      {/* ─────── MOBILE: header strip horizontal con horario HERO ─────── */}
      <div className="sm:hidden">
        {stamp ? (
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.04] px-4 pt-3.5 pb-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--brand-gold)]">
              {stamp.weekday} {stamp.day} {stamp.month}
            </span>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.04] px-4 pb-4 pt-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-black tabular-nums leading-none text-white">
              {startTime}
            </span>
            <span
              aria-hidden="true"
              className="text-xl leading-none text-[color:var(--text-subtle)]"
            >
              →
            </span>
            <span className="font-mono text-3xl font-black tabular-nums leading-none text-white">
              {endTime}
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            {durationMinutes} min
          </span>
        </div>
      </div>

      {/* ─────── DESKTOP: side column vertical 88px ─────── */}
      <div className="hidden sm:flex sm:w-[96px] sm:shrink-0 sm:flex-col sm:items-stretch sm:border-r sm:border-white/[0.04] sm:bg-[color:var(--surface-0)]/40">
        {stamp ? (
          <div className="flex flex-col items-center justify-center border-b border-white/[0.04] px-2 py-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[color:var(--brand-gold)]">
              {stamp.weekday}
            </p>
            <p className="mt-1 font-mono text-xl font-black leading-none tabular-nums text-white">
              {stamp.day}
            </p>
            <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
              {stamp.month}
            </p>
          </div>
        ) : null}
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-3 py-3">
          <p className="font-mono text-base font-black tabular-nums leading-none text-white">
            {startTime}
          </p>
          <p
            aria-hidden="true"
            className="text-[10px] leading-none text-[color:var(--text-subtle)]"
          >
            ↓
          </p>
          <p className="font-mono text-base font-black tabular-nums leading-none text-[color:var(--text-secondary)]">
            {endTime}
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
            {durationMinutes} min
          </p>
        </div>
      </div>
    </>
  );
}

function StatusPill({
  meta,
  ...rest
}: { meta: StatusMeta } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] animate-fade-in",
        meta.pillClasses,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex size-1.5 rounded-full",
          meta.dotColor,
        )}
      >
        {meta.dotPulse ? (
          <span
            aria-hidden="true"
            className={cn(
              "absolute -inset-1 inline-flex animate-ping rounded-full opacity-40",
              meta.dotColor,
            )}
          />
        ) : null}
      </span>
      {meta.label}
    </span>
  );
}

function RelativeTimeChip({ info }: { info: RelativeTimeInfo }) {
  const toneClasses: Record<RelativeTimeInfo["tone"], string> = {
    info: "border-sky-400/30 bg-sky-400/[0.06] text-sky-300",
    warning: "border-amber-400/30 bg-amber-400/[0.06] text-amber-300",
    danger: "border-[color:var(--danger)]/30 bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
    neutral:
      "border-[color:var(--border-default)] bg-[color:var(--surface-0)] text-[color:var(--text-muted)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] animate-fade-in",
        toneClasses[info.tone],
      )}
    >
      {info.text}
    </span>
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
          className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-subtle)] transition-colors duration-[var(--duration-fast)] press-shrink hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <StickyNote className="size-3" aria-hidden="true" />+ Nota interna
        </button>
      );
    }
    return (
      <div className="mt-3 flex items-start gap-2 rounded-r-[var(--radius-xs)] border-l-2 border-[color:var(--brand-gold)]/50 bg-[color:var(--brand-gold-soft)] px-3 py-2">
        <StickyNote
          className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-gold)]"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[color:var(--brand-gold)]/80">
            Mi nota
          </p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-[color:var(--text-secondary)] sm:text-sm">
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
    );
  }

  return (
    <div className="mt-3 rounded-[var(--radius-xs)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--surface-0)]/80 p-2">
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
          className="rounded-[var(--radius-xs)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-subtle)] transition-colors press-shrink hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isSaving || draft === current}
          className="rounded-[var(--radius-xs)] bg-[color:var(--brand-gold)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-black transition-colors press-shrink hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

function KebabMenu({
  appointment,
  delayWhatsAppHref,
  reviewWhatsAppHref,
  onDuplicate,
  canAdjustDuration,
  durationChanged,
  effectiveDurationMinutes,
  onAdjustActualDuration,
  disabled,
}: {
  appointment: AppointmentData;
  delayWhatsAppHref?: string;
  reviewWhatsAppHref?: string;
  onDuplicate?: (appointment: AppointmentData) => void;
  canAdjustDuration?: boolean;
  durationChanged?: boolean;
  effectiveDurationMinutes: number;
  onAdjustActualDuration?: (
    appointment: AppointmentData,
    nextDurationMinutes: number | null,
  ) => void;
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
    Number(Boolean(onDuplicate)) +
    (canAdjustDuration ? 1 : 0);

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
          "inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] border transition-all duration-[var(--duration-fast)] press-shrink disabled:cursor-not-allowed disabled:opacity-40 sm:size-9",
          isOpen
            ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
            : "border-[color:var(--border-default)] bg-[color:var(--surface-1)] text-[color:var(--brand-gold)]/80 hover:border-[color:var(--brand-gold)] hover:bg-[color:var(--brand-gold-soft)] hover:text-[color:var(--brand-gold)]",
        )}
      >
        <MoreVertical className="size-5 sm:size-4" aria-hidden="true" />
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
          className="absolute right-0 top-full z-20 mt-1.5 w-60 origin-top-right animate-scale-in overflow-hidden rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] shadow-2xl"
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
              <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
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
              <Star className="size-4 shrink-0" aria-hidden="true" />
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
              <Copy className="size-4 shrink-0" aria-hidden="true" />
              Duplicar turno
            </button>
          ) : null}

          {canAdjustDuration ? (
            <div className="border-t border-white/[0.04] bg-[color:var(--surface-0)]/40">
              <p className="px-3 pt-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
                Ajustar duración real
              </p>
              <div className="flex items-center gap-1 px-2 pb-2 pt-1.5">
                <DurationPill
                  label="−5"
                  onClick={() =>
                    onAdjustActualDuration?.(
                      appointment,
                      Math.max(5, effectiveDurationMinutes - 5),
                    )
                  }
                  disabled={disabled}
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
                  disabled={disabled}
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
                  disabled={disabled}
                />
                <DurationPill
                  icon={<TimerReset className="size-3" aria-hidden="true" />}
                  label="reset"
                  iconOnly
                  onClick={() => onAdjustActualDuration?.(appointment, null)}
                  disabled={disabled || !durationChanged}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

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
        "inline-flex h-8 flex-1 items-center justify-center rounded-[var(--radius-xs)] border font-mono text-[10px] font-bold transition-colors duration-[var(--duration-fast)] press-shrink disabled:cursor-not-allowed disabled:opacity-40",
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
