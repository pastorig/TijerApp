"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Users } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { listAppointmentsByBarbershop } from "@/lib/appointments";
import { cn } from "@/lib/cn";
import {
  normalizeDateValue,
  normalizeTimeValue,
  timeValueToMinutes,
} from "@/lib/format";
import type { AppointmentRow } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { formatDayHeading, getTodayYmd } from "./date-utils";

type AdminDashboardProps = {
  barbershop: DemoBarbershop;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

function getCurrentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function AdminDashboard({ barbershop }: AdminDashboardProps) {
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

  const todayAppointments = useMemo(
    () =>
      appointments.filter(
        (a) =>
          a.status !== "deleted" &&
          normalizeDateValue(a.appointment_date) === today,
      ),
    [appointments, today],
  );

  const stats = useMemo(
    () => ({
      total: todayAppointments.length,
      pending: todayAppointments.filter((a) => a.status === "pending").length,
      confirmed: todayAppointments.filter((a) => a.status === "confirmed")
        .length,
      cancelled: todayAppointments.filter((a) => a.status === "cancelled")
        .length,
    }),
    [todayAppointments],
  );

  const upcomingAppointment = useMemo(() => {
    return todayAppointments
      .filter(
        (a) =>
          (a.status === "pending" || a.status === "confirmed") &&
          timeValueToMinutes(a.appointment_time) >= currentMinutes,
      )
      .sort(
        (a, b) =>
          timeValueToMinutes(a.appointment_time) -
          timeValueToMinutes(b.appointment_time),
      )[0];
  }, [todayAppointments, currentMinutes]);

  const nextThreeAppointments = useMemo(() => {
    return todayAppointments
      .filter(
        (a) =>
          (a.status === "pending" || a.status === "confirmed") &&
          timeValueToMinutes(a.appointment_time) >= currentMinutes,
      )
      .sort(
        (a, b) =>
          timeValueToMinutes(a.appointment_time) -
          timeValueToMinutes(b.appointment_time),
      )
      .slice(0, 5);
  }, [todayAppointments, currentMinutes]);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <header className="animate-fade-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
          {getGreeting()}
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
          {barbershop.name}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-[color:var(--text-secondary)] sm:text-base">
          {formatDayHeading(today)}
        </p>
      </header>

      {isLoading ? (
        <div className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] p-6 text-sm text-[color:var(--text-secondary)]">
          Cargando dashboard…
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div
          role="alert"
          className="border-l-2 border-[color:var(--danger)] pl-4 text-sm font-semibold text-[color:var(--danger)]"
        >
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <>
          {/* KPIs */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCell label="Turnos hoy" value={stats.total} highlight />
            <StatCell label="Pendientes" value={stats.pending} />
            <StatCell label="Confirmados" value={stats.confirmed} />
            <StatCell label="Cancelados" value={stats.cancelled} />
          </section>

          {/* Próximo turno + próximos */}
          <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            {/* Próximo turno (destacado) */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)]">
                Próximo turno
              </p>
              {upcomingAppointment ? (
                <div className="mt-4 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] p-5">
                  <p className="font-mono text-5xl font-black tabular-nums leading-none text-[color:var(--brand-gold)] sm:text-6xl">
                    {normalizeTimeValue(upcomingAppointment.appointment_time)}
                  </p>
                  <p className="mt-4 text-lg font-bold text-white">
                    {upcomingAppointment.customer_name}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                    {upcomingAppointment.service_name} ·{" "}
                    {upcomingAppointment.service_duration_minutes} min
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    {upcomingAppointment.barber_name}
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-[var(--radius-sm)] border border-dashed border-[color:var(--border-subtle)] p-5">
                  <p className="text-sm text-[color:var(--text-subtle)]">
                    No quedan más turnos hoy.
                  </p>
                </div>
              )}
            </div>

            {/* Próximos en agenda */}
            <div>
              <div className="flex items-end justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
                  Agenda del día
                </p>
                <Link
                  href={`/${barbershop.slug}/admin/turnero`}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold-hi)]"
                >
                  Ver todo
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>

              {nextThreeAppointments.length === 0 ? (
                <p className="mt-4 text-sm text-[color:var(--text-subtle)]">
                  Sin próximos turnos.
                </p>
              ) : (
                <ul className="mt-4 grid gap-2">
                  {nextThreeAppointments.map((appointment) => (
                    <li
                      key={appointment.id}
                      className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-3"
                    >
                      <div className="w-12 shrink-0">
                        <p className="font-mono text-base font-bold tabular-nums leading-none text-white">
                          {normalizeTimeValue(appointment.appointment_time)}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "w-[2px] shrink-0 self-stretch rounded-full",
                          appointment.status === "confirmed"
                            ? "bg-[color:var(--success)]"
                            : "bg-[color:var(--brand-gold)]",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">
                          {appointment.customer_name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[color:var(--text-muted)]">
                          {appointment.service_name} · {appointment.barber_name}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Quick actions */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
              Atajos
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Button
                as="link"
                href={`/${barbershop.slug}/admin/turnero`}
                variant="secondary"
                size="md"
                iconLeft={<CalendarDays className="size-3.5" />}
              >
                Ver turnero completo
              </Button>
              <Button
                as="link"
                href={`/${barbershop.slug}/admin/barbers`}
                variant="secondary"
                size="md"
                iconLeft={<Users className="size-3.5" />}
              >
                Gestionar barberos
              </Button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-sm)] border p-4",
        highlight
          ? "border-[color:var(--border-default)] bg-[color:var(--surface-1)]"
          : "border-[color:var(--border-subtle)]",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-2xl font-black tabular-nums leading-none sm:text-3xl",
          highlight ? "text-[color:var(--brand-gold)]" : "text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}
