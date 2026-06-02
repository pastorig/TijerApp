"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageCircle,
} from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { listAppointmentsByBarbershop } from "@/lib/appointments";
import { cn } from "@/lib/cn";
import {
  formatDateForDisplay,
  normalizeDateValue,
  normalizeTimeValue,
  timeValueToMinutes,
} from "@/lib/format";
import type { AppointmentRow } from "@/lib/supabase";
import {
  createWhatsAppDayBeforeReminderLink,
  createWhatsAppFinalConfirmationLink,
} from "@/lib/whatsapp";

type AdminRemindersManagerProps = {
  barbershop: DemoBarbershop;
};

type ReminderKind = "urgent" | "tomorrow" | "upcoming";

const SENT_STORAGE_KEY = "tijerapp:reminders-sent";

function loadSentMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SENT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveSentMap(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SENT_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / sandbox
  }
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function tomorrowYmd(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function getCurrentMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function AdminRemindersManager({
  barbershop,
}: AdminRemindersManagerProps) {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [sentMap, setSentMap] = useState<Record<string, string>>(() =>
    loadSentMap(),
  );

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const { data, error } = await listAppointmentsByBarbershop(
          barbershop.slug,
        );
        if (!isMounted) return;
        if (error) {
          setErrorMessage("No pudimos cargar los turnos.");
          return;
        }
        setAppointments(data ?? []);
      } catch {
        if (isMounted) setErrorMessage("No pudimos cargar los turnos.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [barbershop.slug]);

  const today = todayYmd();
  const tomorrow = tomorrowYmd();
  const currentMinutes = getCurrentMinutes();

  const { urgent, tomorrowList, upcoming } = useMemo(() => {
    const urgent: AppointmentRow[] = [];
    const tomorrowList: AppointmentRow[] = [];
    const upcoming: AppointmentRow[] = [];
    const horizonDate = new Date();
    horizonDate.setDate(horizonDate.getDate() + 7);
    const horizon = `${horizonDate.getFullYear()}-${String(
      horizonDate.getMonth() + 1,
    ).padStart(2, "0")}-${String(horizonDate.getDate()).padStart(2, "0")}`;

    for (const appointment of appointments) {
      if (appointment.status === "deleted" || appointment.status === "cancelled") {
        continue;
      }
      const date = normalizeDateValue(appointment.appointment_date);
      const time = timeValueToMinutes(appointment.appointment_time);

      // 🔴 Próximas 2 horas: hoy + entre currentMinutes y currentMinutes+120
      if (
        date === today &&
        time >= currentMinutes &&
        time <= currentMinutes + 120
      ) {
        urgent.push(appointment);
      }
      // 🟡 Mañana
      if (date === tomorrow) {
        tomorrowList.push(appointment);
      }
      // 🟢 Próximos 7 días (excluyendo hoy y mañana)
      if (date > tomorrow && date <= horizon) {
        upcoming.push(appointment);
      }
    }
    const sortByDateTime = (a: AppointmentRow, b: AppointmentRow) => {
      const dateCompare = normalizeDateValue(a.appointment_date).localeCompare(
        normalizeDateValue(b.appointment_date),
      );
      if (dateCompare !== 0) return dateCompare;
      return (
        timeValueToMinutes(a.appointment_time) -
        timeValueToMinutes(b.appointment_time)
      );
    };
    urgent.sort(sortByDateTime);
    tomorrowList.sort(sortByDateTime);
    upcoming.sort(sortByDateTime);
    return { urgent, tomorrowList, upcoming };
  }, [appointments, today, tomorrow, currentMinutes]);

  function markAsSent(appointmentId: string, kind: ReminderKind) {
    const key = `${appointmentId}:${kind}`;
    setSentMap((current) => {
      const next = { ...current, [key]: new Date().toISOString() };
      saveSentMap(next);
      return next;
    });
  }

  function unmarkSent(appointmentId: string, kind: ReminderKind) {
    const key = `${appointmentId}:${kind}`;
    setSentMap((current) => {
      const next = { ...current };
      delete next[key];
      saveSentMap(next);
      return next;
    });
  }

  function isSent(appointmentId: string, kind: ReminderKind): boolean {
    return Boolean(sentMap[`${appointmentId}:${kind}`]);
  }

  function getReminderLink(
    appointment: AppointmentRow,
    kind: ReminderKind,
  ): string {
    if (kind === "urgent") {
      return createWhatsAppFinalConfirmationLink({
        barbershopName: barbershop.name,
        clientName: appointment.customer_name,
        clientPhone: appointment.customer_phone,
        serviceName: appointment.service_name,
        barberName: appointment.barber_name,
        date: formatDateForDisplay(appointment.appointment_date),
        time: normalizeTimeValue(appointment.appointment_time),
        confirmationToken: appointment.confirmation_token,
      });
    }
    return createWhatsAppDayBeforeReminderLink({
      barbershopName: barbershop.name,
      clientName: appointment.customer_name,
      clientPhone: appointment.customer_phone,
      serviceName: appointment.service_name,
      barberName: appointment.barber_name,
      date: formatDateForDisplay(appointment.appointment_date),
      time: normalizeTimeValue(appointment.appointment_time),
    });
  }

  function handleSendReminder(
    appointment: AppointmentRow,
    kind: ReminderKind,
  ) {
    if (!appointment.id) return;
    const url = getReminderLink(appointment, kind);
    window.open(url, "_blank", "noopener,noreferrer");
    markAsSent(appointment.id, kind);
  }

  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
          Recordatorios
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
          Turnos próximos
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
          Mandales un recordatorio por WhatsApp con un click. Los marcados
          como enviados quedan grabados en tu navegador para que no los mandes
          dos veces.
        </p>
      </header>

      {errorMessage ? (
        <p
          role="alert"
          className="border-l-2 border-[color:var(--danger)] pl-4 text-sm font-semibold text-[color:var(--danger)]"
        >
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-[color:var(--text-muted)]">Cargando…</p>
      ) : (
        <>
          <ReminderSection
            title="En las próximas 2 horas"
            description="Confirmación urgente. El cliente debería confirmar que vendrá."
            tone="urgent"
            icon={<AlertCircle className="size-5" />}
            appointments={urgent}
            sentMap={sentMap}
            kind="urgent"
            onSend={handleSendReminder}
            onUnmark={unmarkSent}
            isSent={isSent}
          />
          <ReminderSection
            title="Mañana"
            description="Recordatorio del turno del día siguiente. Tono informativo."
            tone="warning"
            icon={<Clock className="size-5" />}
            appointments={tomorrowList}
            sentMap={sentMap}
            kind="tomorrow"
            onSend={handleSendReminder}
            onUnmark={unmarkSent}
            isSent={isSent}
          />
          <ReminderSection
            title="Próximos 7 días"
            description="Vista general. Útil si querés adelantarte con algún cliente."
            tone="info"
            icon={<CalendarDays className="size-5" />}
            appointments={upcoming}
            sentMap={sentMap}
            kind="upcoming"
            onSend={handleSendReminder}
            onUnmark={unmarkSent}
            isSent={isSent}
          />
        </>
      )}
    </div>
  );
}

function ReminderSection({
  title,
  description,
  tone,
  icon,
  appointments,
  kind,
  onSend,
  onUnmark,
  isSent,
}: {
  title: string;
  description: string;
  tone: "urgent" | "warning" | "info";
  icon: React.ReactNode;
  appointments: AppointmentRow[];
  sentMap: Record<string, string>;
  kind: ReminderKind;
  onSend: (appointment: AppointmentRow, kind: ReminderKind) => void;
  onUnmark: (appointmentId: string, kind: ReminderKind) => void;
  isSent: (appointmentId: string, kind: ReminderKind) => boolean;
}) {
  const toneClasses = {
    urgent: {
      iconBg: "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
      label: "text-[color:var(--danger)]",
    },
    warning: {
      iconBg: "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]",
      label: "text-[color:var(--brand-gold)]",
    },
    info: {
      iconBg: "border-[color:var(--border-default)] text-[color:var(--text-secondary)]",
      label: "text-[color:var(--text-muted)]",
    },
  }[tone];

  return (
    <section>
      <header className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full border",
            toneClasses.iconBg,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.18em]",
              toneClasses.label,
            )}
          >
            {title}
            <span className="ml-2 font-mono text-[10px] text-[color:var(--text-muted)]">
              {appointments.length}
            </span>
          </p>
          <p className="mt-1 text-xs text-[color:var(--text-muted)] sm:text-sm">
            {description}
          </p>
        </div>
      </header>

      {appointments.length === 0 ? (
        <p className="mt-4 text-xs text-[color:var(--text-subtle)] sm:text-sm">
          No hay turnos en este grupo.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {appointments.map((appointment) => {
            const id = appointment.id ?? "";
            const sent = id ? isSent(id, kind) : false;
            return (
              <li
                key={
                  appointment.id ??
                  `${appointment.customer_phone}-${appointment.appointment_date}-${appointment.appointment_time}`
                }
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border bg-[color:var(--surface-1)] p-3 transition-colors duration-[var(--duration-fast)]",
                  sent
                    ? "border-[color:var(--success)]/30 opacity-70"
                    : "border-[color:var(--border-subtle)]",
                )}
              >
                <div className="w-16 shrink-0">
                  <p className="font-mono text-base font-bold tabular-nums leading-none text-white">
                    {normalizeTimeValue(appointment.appointment_time)}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-[color:var(--text-muted)]">
                    {formatDateForDisplay(
                      normalizeDateValue(appointment.appointment_date),
                    )}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">
                    {appointment.customer_name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[color:var(--text-muted)]">
                    {appointment.service_name} · {appointment.barber_name}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-[color:var(--text-subtle)]">
                    {appointment.customer_phone}
                  </p>
                </div>
                <div className="shrink-0">
                  {sent ? (
                    <button
                      type="button"
                      onClick={() => id && onUnmark(id, kind)}
                      className="inline-flex min-h-9 items-center gap-1 rounded-[var(--radius-sm)] border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--success)] transition-colors duration-[var(--duration-fast)] hover:opacity-80"
                    >
                      <CheckCircle2 className="size-3" />
                      Enviado
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSend(appointment, kind)}
                      className="inline-flex min-h-9 items-center gap-1 rounded-[var(--radius-sm)] border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--success)] transition-colors duration-[var(--duration-fast)] hover:opacity-80"
                    >
                      <MessageCircle className="size-3" />
                      WhatsApp
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
