"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui";
import type { AppointmentRow, BarberRow } from "@/lib/supabase";
import { generateBarbershopReportPDF } from "@/lib/pdf-export";

type Props = {
  barbershopName: string;
  periodLabel: string;
  appointments: AppointmentRow[];
  barbers: BarberRow[];
};

/**
 * Botón "Exportar PDF" para reportes admin. Toma los appointments del
 * período actual filtrados desde AdminReportes y genera un PDF
 * descargable con métricas, top servicios, top barberos y detalle por día.
 *
 * Todo client-side: usa jsPDF + jspdf-autotable. No requiere API call.
 */
export function ExportReportPdfButton({
  barbershopName,
  periodLabel,
  appointments,
  barbers,
}: Props) {
  const toast = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  function aggregateMetrics() {
    const confirmed = appointments.filter(
      (a) => a.status === "confirmed" || a.status === "pending",
    );
    const cancelled = appointments.filter(
      (a) => a.status === "cancelled" || a.status === "deleted",
    );
    const totalRevenue = confirmed.reduce(
      (acc, a) => acc + (Number(a.service_price) || 0),
      0,
    );
    const avgTicket = confirmed.length > 0 ? totalRevenue / confirmed.length : 0;
    return {
      totalAppointments: appointments.length,
      confirmedAppointments: confirmed.length,
      cancelledAppointments: cancelled.length,
      totalRevenue,
      averageTicket: avgTicket,
    };
  }

  function aggregateTopServices() {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const a of appointments) {
      if (a.status === "cancelled" || a.status === "deleted") continue;
      const entry = map.get(a.service_name) ?? { count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += Number(a.service_price) || 0;
      map.set(a.service_name, entry);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  function aggregateTopBarbers() {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const a of appointments) {
      if (a.status === "cancelled" || a.status === "deleted") continue;
      const barber = barbers.find((b) => b.id === a.barber_id);
      const name =
        barber?.display_name?.trim() || barber?.name || a.barber_name;
      const entry = map.get(name) ?? { count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += Number(a.service_price) || 0;
      map.set(name, entry);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  function aggregateByDay() {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const a of appointments) {
      if (a.status === "cancelled" || a.status === "deleted") continue;
      const entry = map.get(a.appointment_date) ?? { count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += Number(a.service_price) || 0;
      map.set(a.appointment_date, entry);
    }
    return Array.from(map.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function handleExport() {
    setIsGenerating(true);
    try {
      generateBarbershopReportPDF({
        barbershopName,
        periodLabel,
        generatedAt: new Date(),
        metrics: aggregateMetrics(),
        topServices: aggregateTopServices(),
        topBarbers: aggregateTopBarbers(),
        byDay: aggregateByDay(),
      });
      toast.success("PDF generado", {
        description: "Se descargó al dispositivo.",
      });
    } catch (err) {
      toast.error("Error generando PDF", {
        description: err instanceof Error ? err.message : "Error desconocido.",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isGenerating || appointments.length === 0}
      title={
        appointments.length === 0
          ? "Sin datos en este período"
          : "Descargar PDF con métricas y detalle"
      }
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold)] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isGenerating ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          Generando…
        </>
      ) : (
        <>
          <FileText className="size-3.5" />
          <Download className="size-3.5" />
          PDF
        </>
      )}
    </button>
  );
}
