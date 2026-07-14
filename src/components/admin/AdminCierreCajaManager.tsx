"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Minus } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { listAppointmentsByBarbershop } from "@/lib/appointments";
import { cn } from "@/lib/cn";
import {
  formatDateForDisplay,
  formatPrice,
  normalizeDateValue,
  normalizeTimeValue,
  timeValueToMinutes,
} from "@/lib/format";
import type { AppointmentRow } from "@/lib/supabase";

type AdminCierreCajaManagerProps = {
  barbershop: DemoBarbershop;
};

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function previousDayYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function nextDayYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

type DayStats = {
  totalCobrado: number;
  totalPotencial: number;
  turnosConfirmados: number;
  turnosPendientes: number;
  turnosCancelados: number;
  ticketPromedio: number;
};

function computeDayStats(appointments: AppointmentRow[]): DayStats {
  const confirmed = appointments.filter((a) => a.status === "confirmed");
  const pending = appointments.filter((a) => a.status === "pending");
  const cancelled = appointments.filter((a) => a.status === "cancelled");
  const totalCobrado = confirmed.reduce(
    (acc, a) => acc + (a.service_price ?? 0),
    0,
  );
  const totalPotencial =
    totalCobrado +
    pending.reduce((acc, a) => acc + (a.service_price ?? 0), 0);
  return {
    totalCobrado,
    totalPotencial,
    turnosConfirmados: confirmed.length,
    turnosPendientes: pending.length,
    turnosCancelados: cancelled.length,
    ticketPromedio: confirmed.length > 0 ? totalCobrado / confirmed.length : 0,
  };
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function AdminCierreCajaManager({
  barbershop,
}: AdminCierreCajaManagerProps) {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayYmd());

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

  const dayAppointments = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            a.status !== "deleted" &&
            normalizeDateValue(a.appointment_date) === selectedDate,
        )
        .sort(
          (a, b) =>
            timeValueToMinutes(a.appointment_time) -
            timeValueToMinutes(b.appointment_time),
        ),
    [appointments, selectedDate],
  );

  const previousDayAppointments = useMemo(() => {
    const prev = previousDayYmd(selectedDate);
    return appointments.filter(
      (a) =>
        a.status !== "deleted" && normalizeDateValue(a.appointment_date) === prev,
    );
  }, [appointments, selectedDate]);

  const stats = useMemo(() => computeDayStats(dayAppointments), [dayAppointments]);
  const prevStats = useMemo(
    () => computeDayStats(previousDayAppointments),
    [previousDayAppointments],
  );

  const byBarber = useMemo(() => {
    type Row = {
      id: string;
      name: string;
      confirmados: number;
      pendientes: number;
      cobrado: number;
    };
    const map = new Map<string, Row>();
    for (const appointment of dayAppointments) {
      if (appointment.status === "cancelled") continue;
      const row =
        map.get(appointment.barber_id) ?? {
          id: appointment.barber_id,
          name: appointment.barber_name,
          confirmados: 0,
          pendientes: 0,
          cobrado: 0,
        };
      if (appointment.status === "confirmed") {
        row.confirmados += 1;
        row.cobrado += appointment.service_price ?? 0;
      } else if (appointment.status === "pending") {
        row.pendientes += 1;
      }
      map.set(appointment.barber_id, row);
    }
    return Array.from(map.values()).sort((a, b) => b.cobrado - a.cobrado);
  }, [dayAppointments]);

  async function handleExportPdf() {
    // Dynamic import para no engordar el bundle inicial.
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const dateLabel = isToday
      ? `Hoy · ${formatDateForDisplay(selectedDate)}`
      : formatDateForDisplay(selectedDate);

    // Header
    doc.setTextColor(201, 162, 62); // gold
    doc.setFontSize(10);
    doc.text("TIJERAPP · CIERRE DE CAJA", margin, margin);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(barbershop.name, margin, margin + 24);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(dateLabel, margin, margin + 44);

    // KPIs
    const kpiY = margin + 70;
    const kpiBoxW = (pageWidth - margin * 2 - 24) / 4;
    const kpis = [
      { label: "Cobrado real", value: formatPrice(stats.totalCobrado) },
      { label: "Potencial", value: formatPrice(stats.totalPotencial) },
      {
        label: "Ticket prom.",
        value: formatPrice(Math.round(stats.ticketPromedio)),
      },
      { label: "Confirmados", value: String(stats.turnosConfirmados) },
    ];
    kpis.forEach((kpi, index) => {
      const x = margin + index * (kpiBoxW + 8);
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(x, kpiY, kpiBoxW, 56, 4, 4, "FD");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(kpi.label.toUpperCase(), x + 8, kpiY + 14);
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(kpi.value, x + 8, kpiY + 38);
      doc.setFont("helvetica", "normal");
    });

    let cursorY = kpiY + 80;

    // Producción por barbero
    if (byBarber.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Producción por barbero", margin, cursorY);
      cursorY += 10;
      autoTable(doc, {
        startY: cursorY,
        margin: { left: margin, right: margin },
        head: [["Barbero", "Confirmados", "Pendientes", "Cobrado"]],
        body: byBarber.map((row) => [
          row.name,
          String(row.confirmados),
          String(row.pendientes),
          formatPrice(row.cobrado),
        ]),
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: {
          fillColor: [40, 40, 40],
          textColor: [201, 162, 62],
          fontStyle: "bold",
        },
        columnStyles: {
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right", fontStyle: "bold" },
        },
      });
      cursorY =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 24;
    }

    // Detalle
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Detalle (${dayAppointments.length})`, margin, cursorY);
    cursorY += 10;
    if (dayAppointments.length === 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text("Sin turnos este día.", margin, cursorY + 14);
    } else {
      autoTable(doc, {
        startY: cursorY,
        margin: { left: margin, right: margin },
        head: [["Hora", "Cliente", "Servicio", "Barbero", "Estado", "Precio"]],
        body: dayAppointments.map((appointment) => [
          normalizeTimeValue(appointment.appointment_time),
          appointment.customer_name,
          appointment.service_name,
          appointment.barber_name,
          appointment.status === "confirmed"
            ? "Cobrado"
            : appointment.status === "cancelled"
              ? "Cancelado"
              : "Pendiente",
          formatPrice(appointment.service_price ?? 0),
        ]),
        styles: { fontSize: 8, cellPadding: 5 },
        headStyles: {
          fillColor: [40, 40, 40],
          textColor: [201, 162, 62],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 50 },
          5: { halign: "right", fontStyle: "bold" },
        },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(
        `TijerApp · ${barbershop.name} · ${dateLabel}  ·  Página ${i} de ${pageCount}`,
        margin,
        doc.internal.pageSize.getHeight() - 20,
      );
    }

    doc.save(`cierre-caja-${barbershop.slug}-${selectedDate}.pdf`);
  }

  function handleExportCsv() {
    const lines: string[] = [];
    lines.push(
      [
        "Hora",
        "Cliente",
        "Teléfono",
        "Servicio",
        "Barbero",
        "Estado",
        "Precio",
      ]
        .map(csvCell)
        .join(","),
    );
    for (const appointment of dayAppointments) {
      lines.push(
        [
          normalizeTimeValue(appointment.appointment_time),
          appointment.customer_name,
          appointment.customer_phone,
          appointment.service_name,
          appointment.barber_name,
          appointment.status,
          String(appointment.service_price ?? 0),
        ]
          .map(csvCell)
          .join(","),
      );
    }
    const csv = lines.join("\n");
    const blob = new Blob([`﻿${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cierre-caja-${barbershop.slug}-${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const isToday = selectedDate === todayYmd();
  const nextDate = nextDayYmd(selectedDate);
  const canGoNext = nextDate <= todayYmd();

  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
          Cierre de caja
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
          {isToday ? "Hoy" : formatDateForDisplay(selectedDate)}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
          Resumen del día: cobrado real, potencial, producción por barbero
          y detalle de todos los turnos.
        </p>
      </header>

      {/* Selector de fecha */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedDate(previousDayYmd(selectedDate))}
            aria-label="Día anterior"
            className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            max={todayYmd()}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="min-h-9 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
          />
          <button
            type="button"
            onClick={() => setSelectedDate(nextDate)}
            disabled={!canGoNext}
            aria-label="Día siguiente"
            className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
          {!isToday ? (
            <button
              type="button"
              onClick={() => setSelectedDate(todayYmd())}
              className="ml-2 inline-flex min-h-9 items-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
            >
              Hoy
            </button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={dayAppointments.length === 0}
            className="inline-flex min-h-9 items-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-soft)]/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-3" />
            PDF
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={dayAppointments.length === 0}
            className="inline-flex min-h-9 items-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-3" />
            CSV
          </button>
        </div>
      </section>

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
          {/* KPIs */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Cobrado real"
              value={formatPrice(stats.totalCobrado)}
              change={percentChange(stats.totalCobrado, prevStats.totalCobrado)}
              highlight
            />
            <KpiCard
              label="Potencial"
              value={formatPrice(stats.totalPotencial)}
              hint={
                stats.turnosPendientes > 0
                  ? `Si confirmás los ${stats.turnosPendientes} pendientes`
                  : "Sin pendientes"
              }
              change={null}
            />
            <KpiCard
              label="Ticket promedio"
              value={formatPrice(Math.round(stats.ticketPromedio))}
              change={percentChange(
                stats.ticketPromedio,
                prevStats.ticketPromedio,
              )}
            />
            <KpiCard
              label="Confirmados"
              value={String(stats.turnosConfirmados)}
              change={percentChange(
                stats.turnosConfirmados,
                prevStats.turnosConfirmados,
              )}
            />
          </section>

          {/* Producción por barbero */}
          {byBarber.length > 0 ? (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
                Producción por barbero
              </p>
              <div className="mt-4 overflow-hidden rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)]">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[color:var(--surface-1)]">
                    <tr className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                      <th className="px-3 py-2 sm:px-4">Barbero</th>
                      <th className="px-3 py-2 text-right sm:px-4">Confirmados</th>
                      <th className="hidden px-3 py-2 text-right sm:table-cell sm:px-4">
                        Pendientes
                      </th>
                      <th className="px-3 py-2 text-right sm:px-4">Cobrado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border-subtle)]">
                    {byBarber.map((row) => (
                      <tr key={row.id} className="hover:bg-[color:var(--surface-1)]">
                        <td className="px-3 py-3 font-bold text-white sm:px-4">
                          {row.name}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-[color:var(--success)] sm:px-4">
                          {row.confirmados}
                        </td>
                        <td className="hidden px-3 py-3 text-right font-mono tabular-nums text-[color:var(--brand-gold)] sm:table-cell sm:px-4">
                          {row.pendientes}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums font-bold text-[color:var(--brand-gold)] sm:px-4">
                          {formatPrice(row.cobrado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {/* Detalle de turnos */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
              Detalle ({dayAppointments.length})
            </p>
            {dayAppointments.length === 0 ? (
              <div className="mt-4 rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-subtle)] p-10 text-center">
                <p className="text-sm font-bold text-white">Sin turnos este día</p>
              </div>
            ) : (
              <ul className="mt-4 grid gap-2">
                {dayAppointments.map((appointment) => (
                  <li
                    key={appointment.id}
                    className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-3"
                  >
                    <p className="w-12 shrink-0 font-mono text-base font-bold tabular-nums leading-none text-white">
                      {normalizeTimeValue(appointment.appointment_time)}
                    </p>
                    <div
                      className={cn(
                        "w-[2px] shrink-0 self-stretch rounded-full",
                        appointment.status === "confirmed"
                          ? "bg-[color:var(--success)]"
                          : appointment.status === "cancelled"
                            ? "bg-[color:var(--danger)]"
                            : "bg-gold-grad",
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
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "font-mono text-sm font-bold tabular-nums",
                          appointment.status === "confirmed"
                            ? "text-[color:var(--brand-gold)]"
                            : appointment.status === "cancelled"
                              ? "text-[color:var(--text-subtle)] line-through"
                              : "text-white",
                        )}
                      >
                        {formatPrice(appointment.service_price ?? 0)}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                          appointment.status === "confirmed"
                            ? "text-[color:var(--success)]"
                            : appointment.status === "cancelled"
                              ? "text-[color:var(--danger)]"
                              : "text-[color:var(--brand-gold)]",
                        )}
                      >
                        {appointment.status === "confirmed"
                          ? "Cobrado"
                          : appointment.status === "cancelled"
                            ? "Cancelado"
                            : "Pendiente"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function csvCell(value: string): string {
  const needsQuoting = /[",\n]/.test(value);
  if (!needsQuoting) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function KpiCard({
  label,
  value,
  change,
  highlight,
  hint,
}: {
  label: string;
  value: string;
  change: number | null;
  highlight?: boolean;
  hint?: string;
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
      {hint ? (
        <p className="mt-1 text-[10px] text-[color:var(--text-subtle)]">{hint}</p>
      ) : null}
      <ChangeBadge change={change} />
    </div>
  );
}

function ChangeBadge({ change }: { change: number | null }) {
  if (change === null) {
    return (
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
        Sin día anterior
      </p>
    );
  }
  const rounded = Math.abs(change) < 0.05 ? 0 : change;
  const isUp = rounded > 0;
  const isDown = rounded < 0;
  return (
    <p
      className={cn(
        "mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
        isUp
          ? "text-[color:var(--success)]"
          : isDown
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
      {Math.abs(rounded).toFixed(1)}% vs día anterior
    </p>
  );
}
