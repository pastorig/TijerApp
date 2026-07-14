"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { listAppointmentsByBarbershop } from "@/lib/appointments";
import { listBarbersByBarbershop } from "@/lib/barbers";
import { cn } from "@/lib/cn";
import {
  formatPrice,
  normalizeDateValue,
  timeValueToMinutes,
} from "@/lib/format";
import type { AppointmentRow, BarberRow } from "@/lib/supabase";
import { Select } from "@/components/ui";
import { getTodayYmd, parseYmd, toYmd } from "./date-utils";
import { ExportReportPdfButton } from "./ExportReportPdfButton";

type AdminReportesProps = {
  barbershop: DemoBarbershop;
};

type PeriodKey = "today" | "week" | "month";

const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
];

// ── Helpers de período ────────────────────────────────────────────
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Dom, 1=Lun, …
  const diff = day === 0 ? -6 : 1 - day; // lunes = inicio
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getPeriodRange(
  period: PeriodKey,
  offset: 0 | -1,
): { start: string; end: string; days: number } {
  const today = parseYmd(getTodayYmd());
  if (period === "today") {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const ymd = toYmd(d);
    return { start: ymd, end: ymd, days: 1 };
  }
  if (period === "week") {
    const startCurrent = getStartOfWeek(today);
    const start = new Date(startCurrent);
    start.setDate(start.getDate() + offset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start: toYmd(start), end: toYmd(end), days: 7 };
  }
  // month
  const start = new Date(
    today.getFullYear(),
    today.getMonth() + offset,
    1,
  );
  const end = new Date(
    today.getFullYear(),
    today.getMonth() + offset + 1,
    0,
  );
  const days = Math.round(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  ) + 1;
  return { start: toYmd(start), end: toYmd(end), days };
}

function isWithinRange(ymd: string, start: string, end: string): boolean {
  return ymd >= start && ymd <= end;
}

// ── Stats helpers ─────────────────────────────────────────────────
type Stats = {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  /** Ingresos asegurados (solo confirmados). */
  revenue: number;
  /** Ingresos si todos los pendientes se confirman (confirmados + pendientes). */
  potentialRevenue: number;
  /** Ticket promedio sobre turnos confirmados. */
  ticketAvg: number;
  /** % de turnos confirmados sobre el total activo. */
  confirmationRate: number;
  /** % de turnos cancelados sobre el total activo. */
  cancellationRate: number;
  /** Promedio de turnos por día del período. */
  avgPerDay: number;
};

function computeStats(
  appointments: AppointmentRow[],
  days: number,
): Stats {
  const active = appointments.filter((a) => a.status !== "deleted");
  const confirmed = active.filter((a) => a.status === "confirmed");
  const pending = active.filter((a) => a.status === "pending");
  const cancelled = active.filter((a) => a.status === "cancelled");
  const revenue = confirmed.reduce(
    (acc, a) => acc + (a.service_price ?? 0),
    0,
  );
  const potentialRevenue =
    revenue +
    pending.reduce((acc, a) => acc + (a.service_price ?? 0), 0);
  const ticketAvg = confirmed.length > 0 ? revenue / confirmed.length : 0;
  const confirmationRate =
    active.length > 0 ? (confirmed.length / active.length) * 100 : 0;
  const cancellationRate =
    active.length > 0 ? (cancelled.length / active.length) * 100 : 0;
  const avgPerDay = days > 0 ? active.length / days : 0;
  return {
    total: active.length,
    confirmed: confirmed.length,
    pending: pending.length,
    cancelled: cancelled.length,
    revenue,
    potentialRevenue,
    ticketAvg,
    confirmationRate,
    cancellationRate,
    avgPerDay,
  };
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

// ── Componente ────────────────────────────────────────────────────
export function AdminReportes({ barbershop }: AdminReportesProps) {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [selectedBarber, setSelectedBarber] = useState("all");

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [appsResult, barbersResult] = await Promise.all([
          listAppointmentsByBarbershop(barbershop.slug),
          listBarbersByBarbershop(barbershop.slug),
        ]);
        if (!isMounted) return;
        if (appsResult.error) {
          setErrorMessage("No pudimos cargar los reportes.");
          setAppointments([]);
          return;
        }
        setAppointments(appsResult.data ?? []);
        setBarbers(barbersResult.data ?? []);
      } catch {
        if (isMounted) {
          setErrorMessage("No pudimos cargar los reportes.");
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

  // Rangos
  const currentRange = useMemo(() => getPeriodRange(period, 0), [period]);
  const previousRange = useMemo(() => getPeriodRange(period, -1), [period]);

  const matchesBarber = useMemo(() => {
    return (a: AppointmentRow) =>
      selectedBarber === "all" || a.barber_id === selectedBarber;
  }, [selectedBarber]);

  // Citas del período filtradas por barbero
  const currentAppointments = useMemo(
    () =>
      appointments.filter(
        (a) =>
          matchesBarber(a) &&
          isWithinRange(
            normalizeDateValue(a.appointment_date),
            currentRange.start,
            currentRange.end,
          ),
      ),
    [appointments, matchesBarber, currentRange],
  );

  const previousAppointments = useMemo(
    () =>
      appointments.filter(
        (a) =>
          matchesBarber(a) &&
          isWithinRange(
            normalizeDateValue(a.appointment_date),
            previousRange.start,
            previousRange.end,
          ),
      ),
    [appointments, matchesBarber, previousRange],
  );

  const stats = useMemo(
    () => computeStats(currentAppointments, currentRange.days),
    [currentAppointments, currentRange.days],
  );
  const previousStats = useMemo(
    () => computeStats(previousAppointments, previousRange.days),
    [previousAppointments, previousRange.days],
  );

  // Producción por barbero
  const byBarber = useMemo(() => {
    type Row = {
      id: string;
      name: string;
      total: number;
      confirmed: number;
      cancelled: number;
      revenue: number;
    };
    const map = new Map<string, Row>();
    currentAppointments
      .filter((a) => a.status !== "deleted")
      .forEach((a) => {
        const id = a.barber_id;
        const name = a.barber_name;
        const row =
          map.get(id) ??
          { id, name, total: 0, confirmed: 0, cancelled: 0, revenue: 0 };
        row.total += 1;
        if (a.status === "confirmed") row.confirmed += 1;
        if (a.status === "cancelled") row.cancelled += 1;
        if (a.status === "confirmed" || a.status === "pending") {
          row.revenue += a.service_price ?? 0;
        }
        map.set(id, row);
      });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [currentAppointments]);

  // Top servicios
  const topServices = useMemo(() => {
    type Row = { name: string; count: number; revenue: number };
    const map = new Map<string, Row>();
    currentAppointments
      .filter((a) => a.status === "confirmed" || a.status === "pending")
      .forEach((a) => {
        const row =
          map.get(a.service_name) ??
          { name: a.service_name, count: 0, revenue: 0 };
        row.count += 1;
        row.revenue += a.service_price ?? 0;
        map.set(a.service_name, row);
      });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [currentAppointments]);

  // Horarios pico (por hora del día)
  const peakHours = useMemo(() => {
    const counts = new Array(24).fill(0) as number[];
    currentAppointments
      .filter((a) => a.status !== "deleted" && a.status !== "cancelled")
      .forEach((a) => {
        const hour = Math.floor(timeValueToMinutes(a.appointment_time) / 60);
        if (hour >= 0 && hour < 24) counts[hour] += 1;
      });
    const max = Math.max(...counts, 1);
    // Solo mostramos las horas con al menos 1 turno
    return counts
      .map((count, hour) => ({ hour, count, ratio: count / max }))
      .filter((row) => row.count > 0);
  }, [currentAppointments]);

  // Clientes recurrentes
  const topClients = useMemo(() => {
    type Row = { name: string; count: number; lastDate: string };
    const map = new Map<string, Row>();
    appointments
      .filter(
        (a) =>
          matchesBarber(a) &&
          a.status !== "deleted" &&
          a.status !== "cancelled",
      )
      .forEach((a) => {
        const key = `${a.customer_phone}|${a.customer_name}`;
        const row =
          map.get(key) ??
          { name: a.customer_name, count: 0, lastDate: "" };
        row.count += 1;
        const date = normalizeDateValue(a.appointment_date);
        if (date > row.lastDate) row.lastDate = date;
        map.set(key, row);
      });
    return Array.from(map.values())
      .filter((r) => r.count >= 2) // Solo recurrentes
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [appointments, matchesBarber]);

  // Día más activo de la semana (cuenta turnos activos por día)
  const weekDayStats = useMemo(() => {
    const counts = new Array(7).fill(0) as number[];
    currentAppointments
      .filter((a) => a.status !== "deleted")
      .forEach((a) => {
        const date = parseYmd(normalizeDateValue(a.appointment_date));
        const dow = date.getDay(); // 0=Dom
        counts[dow] += 1;
      });
    const max = Math.max(...counts, 0);
    // Reordenamos a Lun→Dom para mostrar
    const order = [1, 2, 3, 4, 5, 6, 0];
    const labels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const rows = order.map((dow, index) => ({
      dow,
      label: labels[index],
      count: counts[dow],
      ratio: max > 0 ? counts[dow] / max : 0,
    }));
    const top = rows.reduce(
      (best, current) => (current.count > best.count ? current : best),
      { label: "", count: 0, dow: -1, ratio: 0 },
    );
    return { rows, top };
  }, [currentAppointments]);

  // Clientes nuevos vs recurrentes en el período actual
  const clientMix = useMemo(() => {
    const periodStart = currentRange.start;
    // Identificamos clientes por teléfono normalizado.
    const uniqueInPeriod = new Map<string, AppointmentRow>();
    currentAppointments
      .filter((a) => a.status !== "deleted")
      .forEach((a) => {
        const key = (a.customer_phone ?? "").trim() || a.customer_name;
        if (!uniqueInPeriod.has(key)) uniqueInPeriod.set(key, a);
      });

    // Set de clientes con turnos previos al inicio del período.
    const priorClients = new Set<string>();
    appointments
      .filter(
        (a) =>
          matchesBarber(a) &&
          a.status !== "deleted" &&
          normalizeDateValue(a.appointment_date) < periodStart,
      )
      .forEach((a) => {
        const key = (a.customer_phone ?? "").trim() || a.customer_name;
        priorClients.add(key);
      });

    let nuevos = 0;
    let recurrentes = 0;
    uniqueInPeriod.forEach((_, key) => {
      if (priorClients.has(key)) recurrentes += 1;
      else nuevos += 1;
    });
    const total = nuevos + recurrentes;
    return {
      nuevos,
      recurrentes,
      total,
      nuevosPct: total > 0 ? (nuevos / total) * 100 : 0,
      recurrentesPct: total > 0 ? (recurrentes / total) * 100 : 0,
    };
  }, [appointments, currentAppointments, currentRange.start, matchesBarber]);

  const barberOptions = useMemo(() => {
    if (barbers.length > 0) {
      return barbers.map((b) => ({
        id: b.id,
        name: b.display_name?.trim() || b.name,
      }));
    }
    return [];
  }, [barbers]);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <header className="animate-fade-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
          Reportes
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
          Análisis y métricas
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
          Operación, ingresos y rendimiento de {barbershop.name}.
        </p>
      </header>

      {isLoading ? (
        <div className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] p-6 text-sm text-[color:var(--text-secondary)]">
          Cargando reportes…
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
          {/* Controles: período + barbero */}
          <section className="grid gap-3 sm:grid-cols-[1fr_minmax(0,16rem)]">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {PERIOD_OPTIONS.map((opt) => {
                const isActive = period === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPeriod(opt.value)}
                    className={cn(
                      "inline-flex min-h-9 shrink-0 items-center rounded-[var(--radius-sm)] border px-3 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-[var(--duration-fast)]",
                      isActive
                        ? "border-[color:var(--brand-gold)] bg-gold-grad text-black"
                        : "border-[color:var(--border-default)] text-[color:var(--text-secondary)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {barberOptions.length > 1 ? (
                <Select
                  aria-label="Filtrar por barbero"
                  value={selectedBarber}
                  onChange={(e) => setSelectedBarber(e.target.value)}
                  className="flex-1"
                >
                  <option value="all">Todos los barberos</option>
                  {barberOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              ) : null}
              <ExportReportPdfButton
                barbershopName={barbershop.name}
                periodLabel={
                  PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? "Período"
                }
                appointments={currentAppointments}
                previousAppointments={previousAppointments}
                barbers={barbers}
              />
            </div>
          </section>

          {/* KPIs · Operación */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
              Operación
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard
                label="Turnos"
                value={String(stats.total)}
                change={percentChange(stats.total, previousStats.total)}
              />
              <KpiCard
                label="Confirmados"
                value={String(stats.confirmed)}
                change={percentChange(
                  stats.confirmed,
                  previousStats.confirmed,
                )}
              />
              <KpiCard
                label="Cancelados"
                value={String(stats.cancelled)}
                change={percentChange(
                  stats.cancelled,
                  previousStats.cancelled,
                )}
                invertChange
              />
              <KpiCard
                label="Promedio por día"
                value={stats.avgPerDay.toFixed(1)}
                change={percentChange(
                  stats.avgPerDay,
                  previousStats.avgPerDay,
                )}
              />
            </div>
          </section>

          {/* KPIs · Ingresos */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
              Ingresos
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <KpiCard
                label="Ingresos (confirmados)"
                value={formatPrice(stats.revenue)}
                change={percentChange(stats.revenue, previousStats.revenue)}
                highlight
              />
              <KpiCard
                label="Ingresos potenciales"
                value={formatPrice(stats.potentialRevenue)}
                hint={
                  stats.pending > 0
                    ? `Si confirmás los ${stats.pending} pendientes`
                    : "Sin turnos pendientes"
                }
                change={percentChange(
                  stats.potentialRevenue,
                  previousStats.potentialRevenue,
                )}
              />
              <KpiCard
                label="Ticket promedio"
                value={formatPrice(Math.round(stats.ticketAvg))}
                change={percentChange(
                  stats.ticketAvg,
                  previousStats.ticketAvg,
                )}
              />
            </div>
          </section>

          {/* KPIs · Tasas */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
              Tasas
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <KpiCard
                label="Confirmación"
                value={`${stats.confirmationRate.toFixed(1)}%`}
                change={percentChange(
                  stats.confirmationRate,
                  previousStats.confirmationRate,
                )}
              />
              <KpiCard
                label="Cancelación"
                value={`${stats.cancellationRate.toFixed(1)}%`}
                change={percentChange(
                  stats.cancellationRate,
                  previousStats.cancellationRate,
                )}
                invertChange
              />
            </div>
          </section>

          {/* Producción por barbero */}
          {byBarber.length > 0 ? (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
                Producción por barbero
              </p>
              <div className="mt-4 overflow-hidden rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)]">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[color:var(--surface-1)]">
                    <tr className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                      <th className="px-3 py-2 sm:px-4">Barbero</th>
                      <th className="px-3 py-2 text-right sm:px-4">Turnos</th>
                      <th className="hidden px-3 py-2 text-right sm:table-cell sm:px-4">
                        Confirmados
                      </th>
                      <th className="hidden px-3 py-2 text-right sm:table-cell sm:px-4">
                        Cancelados
                      </th>
                      <th className="px-3 py-2 text-right sm:px-4">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border-subtle)]">
                    {byBarber.map((row) => (
                      <tr key={row.id} className="hover:bg-[color:var(--surface-1)]">
                        <td className="px-3 py-3 font-bold text-white sm:px-4">
                          {row.name}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-white sm:px-4">
                          {row.total}
                        </td>
                        <td className="hidden px-3 py-3 text-right font-mono tabular-nums text-[color:var(--success)] sm:table-cell sm:px-4">
                          {row.confirmed}
                        </td>
                        <td className="hidden px-3 py-3 text-right font-mono tabular-nums text-[color:var(--danger)] sm:table-cell sm:px-4">
                          {row.cancelled}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums font-bold text-[color:var(--brand-gold)] sm:px-4">
                          {formatPrice(row.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {/* Top servicios + Horarios pico */}
          <section className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
                Top servicios
              </p>
              {topServices.length === 0 ? (
                <p className="mt-4 text-sm text-[color:var(--text-subtle)]">
                  Sin datos en este período.
                </p>
              ) : (
                <ul className="mt-4 grid gap-2">
                  {topServices.map((service, index) => (
                    <li
                      key={service.name}
                      className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-3"
                    >
                      <span className="font-mono text-xs font-bold tabular-nums text-[color:var(--brand-gold)]">
                        #{index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">
                          {service.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                          {service.count} {service.count === 1 ? "turno" : "turnos"}
                          <span className="mx-1.5 text-[color:var(--text-subtle)]">·</span>
                          <span className="font-mono font-bold text-[color:var(--brand-gold)]">
                            {formatPrice(service.revenue)}
                          </span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
                Horarios pico
              </p>
              {peakHours.length === 0 ? (
                <p className="mt-4 text-sm text-[color:var(--text-subtle)]">
                  Sin datos en este período.
                </p>
              ) : (
                <ul className="mt-4 grid gap-1.5">
                  {peakHours.map((row) => (
                    <li
                      key={row.hour}
                      className="flex items-center gap-3"
                    >
                      <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-[color:var(--text-muted)]">
                        {String(row.hour).padStart(2, "0")}:00
                      </span>
                      <div className="relative h-6 flex-1 overflow-hidden rounded-[var(--radius-xs)] bg-[color:var(--surface-1)]">
                        <div
                          className="h-full bg-gold-grad"
                          style={{ width: `${row.ratio * 100}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right font-mono text-xs font-bold tabular-nums text-white">
                        {row.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Día más activo + Clientes nuevos vs recurrentes */}
          <section className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
                Día más activo
              </p>
              {weekDayStats.top.count === 0 ? (
                <p className="mt-4 text-sm text-[color:var(--text-subtle)]">
                  Sin datos en este período.
                </p>
              ) : (
                <>
                  <p className="mt-4 font-mono text-2xl font-black tabular-nums leading-none text-[color:var(--brand-gold)]">
                    {weekDayStats.top.label}
                    <span className="ml-3 text-base font-bold text-white">
                      {weekDayStats.top.count}{" "}
                      {weekDayStats.top.count === 1 ? "turno" : "turnos"}
                    </span>
                  </p>
                  <ul className="mt-4 grid gap-1.5">
                    {weekDayStats.rows.map((row) => (
                      <li key={row.dow} className="flex items-center gap-3">
                        <span className="w-10 shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                          {row.label}
                        </span>
                        <div className="relative h-5 flex-1 overflow-hidden rounded-[var(--radius-xs)] bg-[color:var(--surface-1)]">
                          <div
                            className={cn(
                              "h-full",
                              row.dow === weekDayStats.top.dow
                                ? "bg-gold-grad"
                                : "bg-[color:var(--brand-silver)]/40",
                            )}
                            style={{ width: `${row.ratio * 100}%` }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right font-mono text-xs font-bold tabular-nums text-white">
                          {row.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
                Clientes en el período
              </p>
              {clientMix.total === 0 ? (
                <p className="mt-4 text-sm text-[color:var(--text-subtle)]">
                  Sin clientes en este período.
                </p>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--brand-gold)]">
                        Nuevos
                      </p>
                      <p className="mt-1 font-mono text-2xl font-black tabular-nums leading-none text-[color:var(--brand-gold)]">
                        {clientMix.nuevos}
                      </p>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                        {clientMix.nuevosPct.toFixed(0)}% del total
                      </p>
                    </div>
                    <div className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                        Recurrentes
                      </p>
                      <p className="mt-1 font-mono text-2xl font-black tabular-nums leading-none text-white">
                        {clientMix.recurrentes}
                      </p>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                        {clientMix.recurrentesPct.toFixed(0)}% del total
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[color:var(--surface-1)]">
                    <div className="flex h-full">
                      <div
                        className="h-full bg-gold-grad"
                        style={{ width: `${clientMix.nuevosPct}%` }}
                      />
                      <div
                        className="h-full bg-[color:var(--brand-silver)]/60"
                        style={{ width: `${clientMix.recurrentesPct}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Clientes recurrentes (histórico) */}
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
              Clientes recurrentes
            </p>
            {topClients.length === 0 ? (
              <p className="mt-4 text-sm text-[color:var(--text-subtle)]">
                Todavía no hay clientes con 2 o más turnos.
              </p>
            ) : (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {topClients.map((client, index) => (
                  <li
                    key={`${client.name}-${index}`}
                    className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-3"
                  >
                    <span className="font-mono text-xs font-bold tabular-nums text-[color:var(--brand-gold)]">
                      #{index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">
                        {client.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                        {client.count} turnos
                        {client.lastDate ? (
                          <>
                            <span className="mx-1.5 text-[color:var(--text-subtle)]">·</span>
                            último el {client.lastDate}
                          </>
                        ) : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  change,
  highlight,
  invertChange,
  hint,
}: {
  label: string;
  value: string;
  change: number | null;
  highlight?: boolean;
  /** Si true, una caída cuenta como mejora (ej: cancelaciones). */
  invertChange?: boolean;
  /** Texto opcional debajo del valor (ej: contexto del cálculo). */
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[var(--radius-md)] border p-4 shadow-card transition-all duration-[var(--duration-fast)] ease-[var(--ease-out-soft)] hover:-translate-y-0.5",
        highlight
          ? "border-[color:var(--brand-gold)]/25 bg-[color:var(--surface-1)] hover:border-[color:var(--brand-gold)]/40"
          : "border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] hover:border-[color:var(--brand-gold)]/25",
      )}
      style={
        highlight
          ? {
              backgroundImage:
                "radial-gradient(120% 130% at 0% 0%, rgba(201,162,62,0.14), rgba(201,162,62,0.03) 26%, transparent 52%)",
            }
          : undefined
      }
    >
      {highlight ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(226,194,102,0.7), transparent)",
          }}
        />
      ) : null}
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-2xl font-black tabular-nums leading-none sm:text-3xl",
          highlight
            ? "w-fit bg-gradient-to-br from-[color:var(--brand-gold-hi)] via-[color:var(--brand-gold)] to-[color:var(--brand-gold-lo)] bg-clip-text text-transparent"
            : "text-white",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[10px] text-[color:var(--text-subtle)]">
          {hint}
        </p>
      ) : null}
      <ChangeBadge change={change} invertChange={invertChange} />
    </div>
  );
}

function ChangeBadge({
  change,
  invertChange,
}: {
  change: number | null;
  invertChange?: boolean;
}) {
  if (change === null) {
    return (
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
        Sin período anterior
      </p>
    );
  }

  const rounded = Math.abs(change) < 0.05 ? 0 : change;
  const isUp = rounded > 0;
  const isDown = rounded < 0;
  const isPositive = invertChange ? isDown : isUp;
  const isNegative = invertChange ? isUp : isDown;

  return (
    <p
      className={cn(
        "mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
        isPositive
          ? "text-[color:var(--success)]"
          : isNegative
            ? "text-[color:var(--danger)]"
            : "text-[color:var(--text-subtle)]",
      )}
    >
      {isUp ? (
        <ArrowUp className="size-3" />
      ) : isDown ? (
        <ArrowDown className="size-3" />
      ) : (
        <Minus className="size-3" />
      )}
      {Math.abs(rounded).toFixed(1)}% vs anterior
    </p>
  );
}
