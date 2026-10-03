"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  Gift,
  LineChart,
  MessageCircle,
  Moon,
  Phone,
  Play,
  Plus,
  Scissors,
  Settings,
  Star,
  Tag,
  User,
  Users,
  UserPlus,
} from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { listAppointmentsByBarbershop } from "@/lib/appointments";
import { cn } from "@/lib/cn";
import {
  formatDateWithWeekday,
  formatPrice,
  normalizeDateValue,
  normalizeTimeValue,
  timeValueToMinutes,
} from "@/lib/format";
import type { AppointmentRow } from "@/lib/supabase";
import { createWhatsAppClientContactLink } from "@/lib/whatsapp";
import { formatDayHeading, getTodayYmd } from "./date-utils";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { DashboardSummary } from "./DashboardSummary";
import { useCurrentPlan } from "./PlanContext";
import { hasFeature } from "@/lib/plans";

type AdminDashboardProps = {
  barbershop: DemoBarbershop;
};

type RelativeTimeInfo = {
  text: string;
  tone: "info" | "warning" | "danger" | "neutral";
};

function getCurrentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getRelativeTimeForAppointment(
  startMinutes: number,
  endMinutes: number,
  nowMinutes: number,
): RelativeTimeInfo {
  if (nowMinutes >= endMinutes) {
    return { text: "Finalizado", tone: "neutral" };
  }
  if (nowMinutes >= startMinutes) {
    return { text: "En curso", tone: "info" };
  }
  const minutesUntil = startMinutes - nowMinutes;
  if (minutesUntil <= 60) {
    return {
      text: `Empieza en ${minutesUntil} min`,
      tone: minutesUntil <= 15 ? "warning" : "info",
    };
  }
  const hours = Math.floor(minutesUntil / 60);
  return { text: `Empieza en ${hours}h`, tone: "info" };
}

const STATUS_META: Record<
  string,
  { label: string; dotColor: string; pillClasses: string }
> = {
  pending: {
    label: "Pendiente",
    dotColor: "bg-amber-400",
    pillClasses: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  },
  confirmed: {
    label: "Confirmado",
    dotColor: "bg-[color:var(--success)]",
    pillClasses:
      "border-[color:var(--success)]/40 bg-[color:var(--success-soft)] text-[color:var(--success)]",
  },
  cancelled: {
    label: "Cancelado",
    dotColor: "bg-[color:var(--danger)]",
    pillClasses:
      "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
  },
};

const TONE_CHIP: Record<RelativeTimeInfo["tone"], string> = {
  info: "border-sky-400/30 bg-sky-400/[0.06] text-sky-300",
  warning: "border-amber-400/30 bg-amber-400/[0.06] text-amber-300",
  danger:
    "border-[color:var(--danger)]/30 bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
  neutral:
    "border-[color:var(--border-default)] bg-[color:var(--surface-0)] text-[color:var(--text-muted)]",
};

/**
 * Hook que re-renderiza cada 60s para mantener fresca la información temporal.
 */
function useTickingMinute() {
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((v) => v + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
}

export function AdminDashboard({ barbershop }: AdminDashboardProps) {
  useTickingMinute();
  const plan = useCurrentPlan();

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const today = getTodayYmd();
  const currentMinutes = getCurrentTimeMinutes();

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const { data, error } = await listAppointmentsByBarbershop(
          barbershop.slug,
        );
        if (!isMounted) return;
        if (error) {
          setErrorMessage("No pudimos cargar las reservas.");
          setAppointments([]);
          return;
        }
        setAppointments(data ?? []);
      } catch {
        if (isMounted) {
          setErrorMessage("No pudimos cargar las reservas.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [barbershop.slug]);

  // Cuántos turnos tuvo la barbería alguna vez (sin eliminados). Lo usa la guía
  // de primeros pasos para dar por hecha la "reserva de prueba".
  const realAppointmentCount = useMemo(
    () => appointments.filter((a) => a.status !== "deleted").length,
    [appointments],
  );

  // Turnos del día (sin eliminados)
  const todayAppointments = useMemo(
    () =>
      appointments.filter(
        (a) =>
          a.status !== "deleted" &&
          normalizeDateValue(a.appointment_date) === today,
      ),
    [appointments, today],
  );

  // Turnos activos (pending/confirmed) — el "trabajo del día"
  const activeAppointments = useMemo(
    () =>
      todayAppointments.filter(
        (a) => a.status === "pending" || a.status === "confirmed",
      ),
    [todayAppointments],
  );

  // KPIs operativos
  const stats = useMemo(() => {
    const total = todayAppointments.length;
    const pending = todayAppointments.filter(
      (a) => a.status === "pending",
    ).length;
    const confirmed = todayAppointments.filter(
      (a) => a.status === "confirmed",
    ).length;
    const cancelled = todayAppointments.filter(
      (a) => a.status === "cancelled",
    ).length;
    // Los turnos que siguen en pie. `total` incluye los cancelados a
    // propósito, porque la tarjeta "Turnos hoy" los desglosa; para todo lo
    // demás —lo programado, lo atendido, la plata— el número que vale es
    // este. Un turno cancelado no es trabajo ni es plata que entra.
    const active = activeAppointments.length;

    // Ingresos estimados = suma de service_price de activos (no cancelados/eliminados)
    const estimatedRevenue = activeAppointments.reduce(
      (sum, a) => sum + (a.service_price ?? 0),
      0,
    );

    // Ocupación = total minutos turnos activos / minutos disponibles del día
    const totalTurnoMinutes = activeAppointments.reduce(
      (sum, a) => sum + (a.service_duration_minutes ?? 0),
      0,
    );
    const workingStartMin = timeValueToMinutes(barbershop.workingHours.start);
    const workingEndMin = timeValueToMinutes(barbershop.workingHours.end);
    const availableMinutes = Math.max(
      0,
      (workingEndMin - workingStartMin) * Math.max(barbershop.barbers.length, 1),
    );
    const occupancyPct =
      availableMinutes > 0
        ? Math.min(100, Math.round((totalTurnoMinutes / availableMinutes) * 100))
        : 0;

    // Cierre estimado = max(start + duration) de los activos
    const latestEndMinutes = activeAppointments.reduce((max, a) => {
      const end =
        timeValueToMinutes(a.appointment_time) +
        (a.service_duration_minutes ?? 0);
      return end > max ? end : max;
    }, 0);
    const baseClosingMin = workingEndMin;
    const effectiveClosingMin =
      latestEndMinutes > baseClosingMin ? latestEndMinutes : baseClosingMin;

    return {
      total,
      active,
      pending,
      confirmed,
      cancelled,
      estimatedRevenue,
      occupancyPct,
      effectiveClosingMin,
      hasOvertime: latestEndMinutes > baseClosingMin,
      baseClosingMin,
    };
  }, [todayAppointments, activeAppointments, barbershop]);

  // Próximo turno + lista de siguientes
  const upcomingSorted = useMemo(() => {
    return activeAppointments
      .filter((a) => timeValueToMinutes(a.appointment_time) >= currentMinutes)
      .sort(
        (a, b) =>
          timeValueToMinutes(a.appointment_time) -
          timeValueToMinutes(b.appointment_time),
      );
  }, [activeAppointments, currentMinutes]);

  const upcomingAppointment = upcomingSorted[0];
  const nextFewAppointments = upcomingSorted.slice(0, 6);

  // Detección de delays — recorre los activos de hoy por barbero ordenados
  // por hora y calcula cuánto se corre el inicio estimado del próximo turno
  // por extensión del anterior. Igual lógica que AdminAppointments pero
  // limitado a HOY para que el dashboard se mantenga liviano.
  const delaysByAppointmentId = useMemo(() => {
    const delays = new Map<string, number>();
    const sorted = [...activeAppointments].sort((a, b) => {
      const byBarber = a.barber_id.localeCompare(b.barber_id);
      if (byBarber !== 0) return byBarber;
      return (
        timeValueToMinutes(a.appointment_time) -
        timeValueToMinutes(b.appointment_time)
      );
    });
    const lastEndByBarber = new Map<string, number>();
    for (const a of sorted) {
      if (!a.id) continue;
      const reservedStart = timeValueToMinutes(a.appointment_time);
      const effectiveDuration =
        a.actual_duration_minutes ?? a.service_duration_minutes ?? 0;
      const previousEnd = lastEndByBarber.get(a.barber_id) ?? reservedStart;
      const estStart = Math.max(reservedStart, previousEnd);
      const estEnd = estStart + effectiveDuration;
      delays.set(a.id, Math.max(0, estStart - reservedStart));
      lastEndByBarber.set(a.barber_id, estEnd);
    }
    return delays;
  }, [activeAppointments]);

  // Turno que está en curso AHORA mismo (si lo hay)
  const inProgressAppointment = useMemo(() => {
    return activeAppointments.find((a) => {
      const start = timeValueToMinutes(a.appointment_time);
      const end = start + (a.service_duration_minutes ?? 0);
      return currentMinutes >= start && currentMinutes < end;
    });
  }, [activeAppointments, currentMinutes]);

  // Mayor delay actual entre todos los turnos del día
  const maxDelayMinutes = useMemo(() => {
    let max = 0;
    for (const value of delaysByAppointmentId.values()) {
      if (value > max) max = value;
    }
    return max;
  }, [delaysByAppointmentId]);

  // Alertas operativas (dinámicas)
  const operationalAlerts = useMemo(() => {
    const alerts: Array<{
      key: string;
      tone: "warning" | "danger" | "info";
      text: string;
    }> = [];

    if (stats.pending > 0) {
      alerts.push({
        key: "pending",
        tone: stats.pending >= 3 ? "warning" : "info",
        text: `${stats.pending} turno${stats.pending === 1 ? "" : "s"} sin confirmar`,
      });
    }
    if (maxDelayMinutes > 0) {
      // Encontrar el turno con mayor delay
      let delayedAppt: AppointmentRow | undefined;
      let maxFound = 0;
      for (const [id, delay] of delaysByAppointmentId) {
        if (delay > maxFound) {
          maxFound = delay;
          delayedAppt = activeAppointments.find((a) => a.id === id);
        }
      }
      if (delayedAppt) {
        alerts.push({
          key: "delay",
          tone: maxDelayMinutes >= 15 ? "danger" : "warning",
          text: `Retraso de +${maxDelayMinutes} min en ${delayedAppt.customer_name}`,
        });
      }
    }
    if (stats.hasOvertime) {
      const overMin = stats.effectiveClosingMin - stats.baseClosingMin;
      alerts.push({
        key: "overtime",
        tone: "warning",
        text: `Cierre extendido +${overMin} min (hasta ${formatMinutesToTime(stats.effectiveClosingMin)})`,
      });
    }
    if (stats.cancelled >= 3) {
      alerts.push({
        key: "cancellations",
        tone: "warning",
        text: `${stats.cancelled} turnos cancelados hoy`,
      });
    }

    return alerts;
  }, [stats, maxDelayMinutes, delaysByAppointmentId, activeAppointments]);

  // Resumen del día — texto inteligente que comunica "cómo va"
  const daySummary = useMemo(() => {
    if (stats.total === 0) return "Día sin turnos cargados todavía";
    if (stats.active === 0) return "Sin turnos en pie — todos cancelados";
    if (stats.active === 1) return "1 turno programado";
    return `${stats.active} turnos programados`;
  }, [stats.total, stats.active]);

  const baseClosingStr = formatMinutesToTime(stats.baseClosingMin);

  /**
   * Estado del día — banner que sintetiza la situación operativa
   * AHORA mismo en una sola línea. Prioriza según urgencia.
   * Pensado como el "All systems operational" de Stripe o el "All done"
   * de Linear: una mirada y entendés cómo viene el día.
   */
  const dayStatus = useMemo((): {
    tone: "info" | "success" | "warning" | "neutral";
    icon: "play" | "clock" | "check" | "warning" | "moon" | "calendar";
    label: string;
    hint?: string;
  } => {
    // Prioridad 1: turno en curso AHORA
    if (inProgressAppointment) {
      const start = timeValueToMinutes(inProgressAppointment.appointment_time);
      const end =
        start + (inProgressAppointment.service_duration_minutes ?? 0);
      const minutesUntilEnd = end - currentMinutes;
      return {
        tone: "info",
        icon: "play",
        label: `Turno en curso · ${inProgressAppointment.customer_name}`,
        hint: `Termina en ${minutesUntilEnd} min`,
      };
    }
    // Prioridad 2: retraso significativo
    if (maxDelayMinutes >= 10) {
      return {
        tone: "warning",
        icon: "warning",
        label: `Retraso de +${maxDelayMinutes} min`,
        hint: "Avisale al cliente",
      };
    }
    // Prioridad 3: próximo cercano
    if (upcomingAppointment) {
      const start = timeValueToMinutes(upcomingAppointment.appointment_time);
      const minutesUntil = start - currentMinutes;
      if (minutesUntil <= 60) {
        return {
          tone: minutesUntil <= 15 ? "warning" : "info",
          icon: "clock",
          label: `Próximo turno en ${minutesUntil} min`,
          hint: `${upcomingAppointment.customer_name} · ${normalizeTimeValue(upcomingAppointment.appointment_time)}`,
        };
      }
      const hours = Math.floor(minutesUntil / 60);
      return {
        tone: "info",
        icon: "clock",
        label: `Próximo turno en ${hours}h`,
        hint: `${upcomingAppointment.customer_name} · ${normalizeTimeValue(upcomingAppointment.appointment_time)}`,
      };
    }
    // Prioridad 4: día completado (había turnos y todos terminaron)
    if (
      stats.total > 0 &&
      !upcomingAppointment &&
      !inProgressAppointment
    ) {
      // Atendidos = confirmados. La cuenta anterior era
      //   confirmed + (total - pending - confirmed - cancelled)
      // y el paréntesis siempre daba CERO, porque total es exactamente la
      // suma de esos tres. O sea que `attended` ya era `confirmed`, con una
      // aritmética de adorno encima. Lo grave era el fallback: cuando no había
      // ningún confirmado, `attended || stats.total` mostraba el TOTAL, que
      // incluye los cancelados. Un barbero que cancelaba dos turnos los veía
      // contados como atendidos, al lado de los ingresos estimados.
      const attended = stats.confirmed;
      const plural = attended === 1 ? "" : "s";
      return {
        tone: "success",
        icon: "check",
        label: "Día completado",
        hint: `${attended} turno${plural} atendido${plural}${stats.estimatedRevenue > 0 ? ` · ${formatPrice(stats.estimatedRevenue)} estimados` : ""}`,
      };
    }
    // Prioridad 5: sin turnos hoy
    if (stats.total === 0) {
      return {
        tone: "neutral",
        icon: "moon",
        label: "Sin turnos para hoy",
        hint: "Día tranquilo · aprovechá",
      };
    }
    // Default: día normal
    return {
      tone: "info",
      icon: "calendar",
      label: `${stats.active} turnos programados`,
      hint: `Cierre estimado ${formatMinutesToTime(stats.effectiveClosingMin)}`,
    };
  }, [
    inProgressAppointment,
    maxDelayMinutes,
    upcomingAppointment,
    currentMinutes,
    stats,
  ]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ─────────────── HEADER útil ─────────────── */}
      <header>
        <h1 className="break-words text-2xl font-semibold text-white sm:text-3xl">
          {barbershop.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-400">
          <span className="capitalize">{formatDayHeading(today)}</span>
          <span className="text-[color:var(--text-subtle)]">·</span>
          <span className="text-[color:var(--text-muted)]">
            {daySummary}
          </span>
          {stats.total > 0 ? (
            <>
              <span className="text-[color:var(--text-subtle)]">·</span>
              <span className="inline-flex items-center gap-1 text-[color:var(--text-muted)]">
                <Clock3
                  className="size-3.5 text-[color:var(--text-subtle)]"
                  aria-hidden="true"
                />
                Cierre {baseClosingStr}
              </span>
            </>
          ) : null}
        </div>
      </header>

      {/* Guía de primeros pasos: arriba de las métricas a propósito. El primer
          día no hay métricas que mirar, así que no tapa nada útil. Se calcula
          del estado real de la barbería y desaparece sola al completarse. */}
      <OnboardingChecklist
        barbershop={barbershop}
        appointmentCount={realAppointmentCount}
      />

      {isLoading ? <DashboardSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div
          role="alert"
          className="rounded-[var(--radius-sm)] border border-[color:var(--danger)]/30 bg-[color:var(--danger-soft)] p-4 text-sm font-semibold text-[color:var(--danger)]"
        >
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <>
          {/* ─────────────── DAY STATUS BANNER ─────────────── */}
          <DayStatusBanner status={dayStatus} />

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <NextAppointmentHero
              appointment={upcomingAppointment}
              currentMinutes={currentMinutes}
              barbershopSlug={barbershop.slug}
              barbershopName={barbershop.name}
              whatsappMessageTemplate={barbershop.whatsappMessageTemplate ?? null}
            />
            <DashboardSummary stats={stats} activeCount={activeAppointments.length}
              closingTime={formatMinutesToTime(stats.effectiveClosingMin)} />
          </div>

          {/* ─────────────── ALERTAS operativas (solo si hay) ─────────────── */}
          {operationalAlerts.length > 0 ? (
            <section className="grid gap-2 sm:grid-cols-2">
              {operationalAlerts.map((alert) => (
                <div
                  key={alert.key}
                  className={cn(
                    "flex items-start gap-2.5 rounded-[var(--radius-sm)] border p-3",
                    alert.tone === "danger"
                      ? "border-[color:var(--danger)]/30 bg-[color:var(--danger-soft)]"
                      : alert.tone === "warning"
                        ? "border-amber-400/30 bg-amber-400/[0.06]"
                        : "border-sky-400/30 bg-sky-400/[0.06]",
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      alert.tone === "danger"
                        ? "text-[color:var(--danger)]"
                        : alert.tone === "warning"
                          ? "text-amber-300"
                          : "text-sky-300",
                    )}
                    aria-hidden="true"
                  />
                  <p
                    className={cn(
                      "text-[12px] font-semibold leading-relaxed sm:text-sm",
                      alert.tone === "danger"
                        ? "text-[color:var(--danger)]"
                        : alert.tone === "warning"
                          ? "text-amber-200"
                          : "text-sky-200",
                    )}
                  >
                    {alert.text}
                  </p>
                </div>
              ))}
            </section>
          ) : null}


          {/* ─────────────── AGENDA DEL DÍA enriquecida ─────────────── */}
          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-300">
                  Agenda del día
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  {nextFewAppointments.length === 0
                    ? "No quedan más turnos hoy"
                    : `Próximos ${nextFewAppointments.length}`}
                </p>
              </div>
              <Link
                href={`/${barbershop.slug}/admin/turnero`}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/10 px-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-gold)]"
              >
                Ver todo
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>

            {nextFewAppointments.length === 0 ? (
              <div className="mt-4 rounded-[var(--radius-sm)] border border-dashed border-white/[0.06] p-6 text-center">
                <p className="text-sm text-[color:var(--text-subtle)]">
                  Día tranquilo. Sin más turnos cargados.
                </p>
              </div>
            ) : (
              <ul className="mt-3 grid min-w-0 gap-2">
                {nextFewAppointments.map((appointment) => {
                  const startMin = timeValueToMinutes(
                    appointment.appointment_time,
                  );
                  const endMin =
                    startMin + (appointment.service_duration_minutes ?? 0);
                  const rel = getRelativeTimeForAppointment(
                    startMin,
                    endMin,
                    currentMinutes,
                  );
                  const statusMeta =
                    STATUS_META[appointment.status ?? "pending"];
                  return (
                    <li key={appointment.id} className="min-w-0">
                      <Link
                        href={`/${barbershop.slug}/admin/turnero`}
                        className="block min-w-0 rounded-lg border border-white/10 bg-[#121214] p-3 transition-colors hover:border-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-gold)]"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          {/* Hora */}
                          <div className="w-14 shrink-0">
                            <p className="font-mono text-base font-black tabular-nums leading-none text-white sm:text-lg">
                              {normalizeTimeValue(appointment.appointment_time)}
                            </p>
                            <p className="mt-1 font-mono text-xs text-neutral-400">
                              {appointment.service_duration_minutes} min
                            </p>
                          </div>

                          {/* Bar de estado */}
                          <div
                            aria-hidden="true"
                            className={cn(
                              "w-[2px] shrink-0 self-stretch rounded-full",
                              statusMeta?.dotColor ??
                                "bg-[color:var(--text-subtle)]",
                            )}
                          />

                          {/* Contenido */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-white sm:text-base">
                              {appointment.customer_name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-[color:var(--text-muted)] sm:text-sm">
                              {appointment.service_name} ·{" "}
                              {appointment.barber_name}
                            </p>
                          </div>

                          {/* Status + relative */}
                          <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                            {statusMeta ? (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium",
                                  statusMeta.pillClasses,
                                )}
                              >
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    "inline-block size-1.5 rounded-full",
                                    statusMeta.dotColor,
                                  )}
                                />
                                {statusMeta.label}
                              </span>
                            ) : null}
                            <span
                              className={cn(
                                "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
                                TONE_CHIP[rel.tone],
                              )}
                            >
                              {rel.text}
                            </span>
                          </div>
                        </div>

                        {/* En mobile, status+relative van debajo en row separada */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:hidden">
                          {statusMeta ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium",
                                statusMeta.pillClasses,
                              )}
                            >
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "inline-block size-1.5 rounded-full",
                                  statusMeta.dotColor,
                                )}
                              />
                              {statusMeta.label}
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
                              TONE_CHIP[rel.tone],
                            )}
                          >
                            {rel.text}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ─────────────── ACCIONES RÁPIDAS ─────────────── */}
          <section>
            <p className="text-sm font-semibold text-neutral-300">
              Acciones rápidas
            </p>

            {/* Primary CTA: + Nuevo turno (ancho, prominente) */}
            <Link
              href={`/${barbershop.slug}/reservar`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[color:var(--brand-gold)] px-4 text-sm font-semibold text-black transition-colors hover:bg-[color:var(--brand-gold-hi)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-gold)]"
            >
              <Plus className="size-4" aria-hidden="true" />
              Nuevo turno
            </Link>

            {/* Accesos secundarios compactos, con nombre visible. */}
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              <QuickActionIcon
                href={`/${barbershop.slug}/admin/turnero`}
                icon={<CalendarDays className="size-5" aria-hidden="true" />}
                label="Turnero"
              />
              <QuickActionIcon
                href={`/${barbershop.slug}/admin/clientes`}
                icon={<User className="size-5" aria-hidden="true" />}
                label="Clientes"
              />
              <QuickActionIcon
                href={`/${barbershop.slug}/admin/barbers`}
                icon={<Users className="size-5" aria-hidden="true" />}
                label="Barberos"
              />
              <QuickActionIcon
                href={`/${barbershop.slug}/admin/resenas`}
                icon={<Star className="size-5" aria-hidden="true" />}
                label="Reseñas"
              />
              <QuickActionIcon
                href={`/${barbershop.slug}/admin/reportes`}
                icon={<LineChart className="size-5" aria-hidden="true" />}
                label="Reportes"
              />
              {hasFeature(plan.tier, "fidelizacion") ? (
                <QuickActionIcon
                  href={`/${barbershop.slug}/admin/fidelizacion`}
                  icon={<Gift className="size-5" aria-hidden="true" />}
                  label="Fidelización"
                />
              ) : null}
              {hasFeature(plan.tier, "cupones") ? (
                <QuickActionIcon
                  href={`/${barbershop.slug}/admin/cupones`}
                  icon={<Tag className="size-5" aria-hidden="true" />}
                  label="Cupones"
                />
              ) : null}
              {hasFeature(plan.tier, "multi_admin") ? (
                <QuickActionIcon
                  href={`/${barbershop.slug}/admin/equipo`}
                  icon={<UserPlus className="size-5" aria-hidden="true" />}
                  label="Equipo"
                />
              ) : null}
              <QuickActionIcon
                href={`/${barbershop.slug}/admin/settings`}
                icon={<Settings className="size-5" aria-hidden="true" />}
                label="Configuración"
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */

function NextAppointmentHero({
  appointment, currentMinutes, barbershopSlug, barbershopName, whatsappMessageTemplate,
}: {
  appointment: AppointmentRow | undefined;
  currentMinutes: number;
  barbershopSlug: string;
  barbershopName: string;
  whatsappMessageTemplate: string | null;
}) {
  if (!appointment) {
    return (
      <section aria-label="Próximo turno">
        <h2 className="mb-3 text-sm font-semibold text-neutral-300">Próximo turno</h2>
        <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-white/15 p-5 text-center">
          <Clock3 className="size-6 text-neutral-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-white">No hay próximos turnos</p>
          <Link href={`/${barbershopSlug}/admin/turnero`} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-[color:var(--brand-gold-hi)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-gold)]">
            Ver agenda <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  const startMin = timeValueToMinutes(appointment.appointment_time);
  const endMin = startMin + (appointment.service_duration_minutes ?? 0);
  const rel = getRelativeTimeForAppointment(startMin, endMin, currentMinutes);
  const statusMeta = STATUS_META[appointment.status ?? "pending"];
  const phoneDigits = appointment.customer_phone?.replace(/\D+/g, "") ?? "";
  // Mensaje pre-cargado para que el barbero no escriba desde cero. Mismo
  // texto que la fila del turnero, e incluye el link de detalle/confirmación.
  const phoneWaHref = phoneDigits
    ? createWhatsAppClientContactLink({
        barbershopName,
        clientName: appointment.customer_name ?? "",
        clientPhone: appointment.customer_phone ?? "",
        date: formatDateWithWeekday(appointment.appointment_date),
        time: normalizeTimeValue(appointment.appointment_time),
        confirmationToken: appointment.confirmation_token,
        template: whatsappMessageTemplate,
      })
    : null;


  return (
    <section aria-label="Próximo turno" className="flex min-w-0 flex-col">
      <h2 className="mb-3 text-sm font-semibold text-neutral-300">Próximo turno</h2>
      <div className="flex flex-1 flex-col rounded-lg border border-[color:var(--brand-gold)]/35 bg-[#151410] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-4xl font-semibold leading-none tabular-nums text-[color:var(--brand-gold-hi)]">
              {normalizeTimeValue(appointment.appointment_time)}
            </p>
            <p className={cn("mt-2 inline-flex items-center rounded border px-2 py-1 text-xs font-medium", TONE_CHIP[rel.tone])}>{rel.text}</p>
          </div>
          {statusMeta ? (
            <span className={cn("inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium", statusMeta.pillClasses)}>
              <span aria-hidden="true" className={cn("size-1.5 rounded-full", statusMeta.dotColor)} />
              {statusMeta.label}
            </span>
          ) : null}
        </div>
        <h3 className="mt-4 break-words text-xl font-semibold leading-tight text-white">{appointment.customer_name}</h3>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="inline-flex min-w-0 items-center gap-2 text-neutral-300">
            <Scissors className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
            <span className="break-words">{appointment.service_name} · {appointment.service_duration_minutes} min</span>
          </span>
          <span className="font-mono font-semibold tabular-nums text-white">{formatPrice(appointment.service_price)}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 text-sm text-neutral-400">
          <span className="inline-flex min-w-0 items-center gap-1.5"><User className="size-4 shrink-0" aria-hidden="true" /><span className="break-words">{appointment.barber_name}</span></span>
          {appointment.customer_phone ? phoneWaHref ? (
            <a href={phoneWaHref} target="_blank" rel="noopener noreferrer" title="Abrir en WhatsApp"
              className="inline-flex min-h-11 items-center gap-1.5 rounded font-mono transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-gold)]">
              <Phone className="size-4 shrink-0" aria-hidden="true" />{appointment.customer_phone}
            </a>
          ) : <span className="inline-flex items-center gap-1.5 font-mono"><Phone className="size-4" aria-hidden="true" />{appointment.customer_phone}</span> : null}
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Link href={`/${barbershopSlug}/admin/turnero`}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[color:var(--brand-gold)] px-3 text-sm font-semibold text-black transition-colors hover:bg-[color:var(--brand-gold-hi)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-gold)]">
            Abrir en turnero <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
          {phoneWaHref ? (
            <a href={phoneWaHref} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[color:var(--success)]/30 px-3 text-sm font-medium text-[color:var(--success)] transition-colors hover:bg-[color:var(--success-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--success)]">
              <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}


function QuickActionIcon({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      title={label}
      className="group flex min-h-12 min-w-0 items-center gap-2.5 rounded-md border border-white/10 bg-[#121214] px-3 py-2 text-neutral-300 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-gold)]"
    >
      <span className="flex size-5 shrink-0 items-center justify-center text-neutral-400 transition-colors group-hover:text-[color:var(--brand-gold)]">
        {icon}
      </span>
      <span className="min-w-0 break-words text-xs font-medium leading-5 sm:text-sm">
        {label}
      </span>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Cargando resumen de hoy" className="space-y-5">
      <span className="sr-only">Cargando resumen de hoy</span>
      <div aria-hidden="true" className="skeleton h-16 rounded-md" />
      <div aria-hidden="true" className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          <div className="skeleton mb-3 h-5 w-28 rounded" />
          <div className="h-64 rounded-lg border border-white/10 bg-[#121214] p-4 sm:p-5">
            <div className="skeleton h-10 w-32 rounded" />
            <div className="skeleton mt-5 h-6 w-48 max-w-full rounded" />
            <div className="skeleton mt-3 h-4 w-40 max-w-full rounded" />
            <div className="skeleton mt-9 h-11 w-full rounded" />
          </div>
        </div>
        <div>
          <div className="skeleton mb-3 h-5 w-28 rounded" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="min-h-28 rounded-lg border border-white/10 bg-[#121214] p-3.5">
                <div className="skeleton h-4 w-20 max-w-full rounded" />
                <div className="skeleton mt-3 h-7 w-16 rounded" />
                <div className="skeleton mt-3 h-3 w-24 max-w-full rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="grid gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#121214] p-3">
            <div className="skeleton h-10 w-12 rounded" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-4 w-32 max-w-full rounded" />
              <div className="skeleton h-3 w-48 max-w-full rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function DayStatusBanner({
  status,
}: {
  status: {
    tone: "info" | "success" | "warning" | "neutral";
    icon: "play" | "clock" | "check" | "warning" | "moon" | "calendar";
    label: string;
    hint?: string;
  };
}) {
  const toneClasses: Record<typeof status.tone, string> = {
    info: "border-sky-400/30 bg-sky-400/[0.06]",
    success: "border-[color:var(--success)]/30 bg-[color:var(--success-soft)]",
    warning: "border-amber-400/30 bg-amber-400/[0.06]",
    neutral: "border-white/[0.04] bg-[color:var(--surface-1)]",
  };
  const iconColors: Record<typeof status.tone, string> = {
    info: "text-sky-300",
    success: "text-[color:var(--success)]",
    warning: "text-amber-300",
    neutral: "text-[color:var(--text-subtle)]",
  };
  const labelColors: Record<typeof status.tone, string> = {
    info: "text-sky-100",
    success: "text-white",
    warning: "text-white",
    neutral: "text-white",
  };
  const dotColors: Record<typeof status.tone, string> = {
    info: "bg-sky-400",
    success: "bg-[color:var(--success)]",
    warning: "bg-amber-400",
    neutral: "bg-[color:var(--text-subtle)]",
  };
  const IconComponent =
    status.icon === "play"
      ? Play
      : status.icon === "clock"
        ? Clock3
        : status.icon === "check"
          ? Check
          : status.icon === "warning"
            ? AlertTriangle
            : status.icon === "moon"
              ? Moon
              : CalendarDays;

  return (
    <section
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-[var(--radius-sm)] border px-4 py-3",
        toneClasses[status.tone],
      )}
    >
      {/* Dot + Icon */}
      <div className="flex shrink-0 items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "relative inline-flex size-2 rounded-full",
            dotColors[status.tone],
          )}
        >
          {status.tone === "warning" ? (
            <span
              aria-hidden="true"
              className={cn(
                "absolute -inset-1 inline-flex animate-ping rounded-full opacity-40",
                dotColors[status.tone],
              )}
            />
          ) : null}
        </span>
        <IconComponent
          className={cn("size-4", iconColors[status.tone])}
          aria-hidden="true"
        />
      </div>
      {/* Label + Hint */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            labelColors[status.tone],
          )}
        >
          {status.label}
        </p>
        {status.hint ? (
          <p className="mt-0.5 text-xs text-neutral-400">
            {status.hint}
          </p>
        ) : null}
      </div>
    </section>
  );
}
