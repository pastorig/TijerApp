"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * PDF Export Helpers — TijerApp
 *
 * Genera PDFs de reportes de la barbería. Pensado para abrirse y guardarse
 * desde el cliente (sin server roundtrip). El barbero clickea "Exportar PDF",
 * se genera en su browser y se descarga directo.
 *
 * Estética: paleta gold + dark TijerApp, fonts default de jsPDF (no
 * cargamos custom fonts para mantener bundle chico).
 */

const GOLD: [number, number, number] = [201, 162, 62]; // #c9a23e
const DARK: [number, number, number] = [13, 13, 13];
const MUTED: [number, number, number] = [138, 138, 138];

type ReportInput = {
  barbershopName: string;
  periodLabel: string; // ej "Mayo 2026", "Semana del 1 al 7 de junio"
  generatedAt: Date;
  metrics: {
    totalAppointments: number;
    confirmedAppointments: number;
    cancelledAppointments: number;
    totalRevenue: number;
    averageTicket: number;
  };
  topServices: Array<{ name: string; count: number; revenue: number }>;
  topBarbers: Array<{ name: string; count: number; revenue: number }>;
  byDay?: Array<{ date: string; count: number; revenue: number }>;
};

function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function generateBarbershopReportPDF(input: ReportInput): void {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    orientation: "portrait",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let cursorY = 56;

  // ─── HEADER ───────────────────────────────────────────────────────
  // Brand color bar arriba
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, pageWidth, 6, "F");

  // Barbería name + report title
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(input.barbershopName, margin, cursorY);

  cursorY += 24;
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`Reporte · ${input.periodLabel}`, margin, cursorY);

  cursorY += 14;
  doc.setFontSize(8);
  doc.text(`Generado: ${formatDate(input.generatedAt)}`, margin, cursorY);

  cursorY += 30;

  // ─── KEY METRICS ──────────────────────────────────────────────────
  // 4 boxes con métricas principales
  const boxWidth = (pageWidth - margin * 2 - 24) / 4;
  const boxHeight = 56;

  type MetricBox = { label: string; value: string; highlight?: boolean };
  const boxes: MetricBox[] = [
    {
      label: "Turnos totales",
      value: String(input.metrics.totalAppointments),
    },
    {
      label: "Confirmados",
      value: String(input.metrics.confirmedAppointments),
      highlight: true,
    },
    {
      label: "Cancelados",
      value: String(input.metrics.cancelledAppointments),
    },
    {
      label: "Ingresos",
      value: formatARS(input.metrics.totalRevenue),
      highlight: true,
    },
  ];

  boxes.forEach((box, idx) => {
    const x = margin + (boxWidth + 8) * idx;
    doc.setFillColor(box.highlight ? GOLD[0] : 245, box.highlight ? GOLD[1] : 245, box.highlight ? GOLD[2] : 245);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(x, cursorY, boxWidth, boxHeight, 4, 4, "FD");

    doc.setTextColor(box.highlight ? 30 : 130, box.highlight ? 30 : 130, box.highlight ? 30 : 130);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(box.label.toUpperCase(), x + 8, cursorY + 14);

    doc.setTextColor(...DARK);
    doc.setFontSize(box.highlight ? 14 : 13);
    doc.text(box.value, x + 8, cursorY + 36);
  });

  cursorY += boxHeight + 20;

  // Ticket promedio
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Ticket promedio: ${formatARS(input.metrics.averageTicket)}`,
    margin,
    cursorY,
  );
  cursorY += 24;

  // ─── TOP SERVICIOS ────────────────────────────────────────────────
  if (input.topServices.length > 0) {
    doc.setTextColor(...DARK);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TOP SERVICIOS", margin, cursorY);
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      head: [["Servicio", "Cantidad", "Ingresos"]],
      body: input.topServices.map((s) => [
        s.name,
        String(s.count),
        formatARS(s.revenue),
      ]),
      theme: "grid",
      headStyles: { fillColor: GOLD, textColor: DARK, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { left: margin, right: margin },
    });

    cursorY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY;
    cursorY += 20;
  }

  // ─── TOP BARBEROS ─────────────────────────────────────────────────
  if (input.topBarbers.length > 0) {
    if (cursorY > 700) {
      doc.addPage();
      cursorY = 56;
    }
    doc.setTextColor(...DARK);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TOP BARBEROS", margin, cursorY);
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      head: [["Barbero", "Turnos", "Ingresos"]],
      body: input.topBarbers.map((b) => [
        b.name,
        String(b.count),
        formatARS(b.revenue),
      ]),
      theme: "grid",
      headStyles: { fillColor: GOLD, textColor: DARK, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { left: margin, right: margin },
    });

    cursorY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY;
    cursorY += 20;
  }

  // ─── POR DÍA ──────────────────────────────────────────────────────
  if (input.byDay && input.byDay.length > 0) {
    if (cursorY > 700) {
      doc.addPage();
      cursorY = 56;
    }
    doc.setTextColor(...DARK);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DETALLE POR DÍA", margin, cursorY);
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      head: [["Fecha", "Turnos", "Ingresos"]],
      body: input.byDay.map((d) => [
        new Date(d.date).toLocaleDateString("es-AR"),
        String(d.count),
        formatARS(d.revenue),
      ]),
      theme: "striped",
      headStyles: { fillColor: GOLD, textColor: DARK, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 5 },
      margin: { left: margin, right: margin },
    });
  }

  // ─── FOOTER ──────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `Generado con TijerApp · ${i} / ${pageCount}`,
      pageWidth / 2,
      pageHeight - 24,
      { align: "center" },
    );
  }

  // ─── SAVE ────────────────────────────────────────────────────────
  const filename = `reporte-${input.barbershopName.toLowerCase().replace(/\s+/g, "-")}-${input.periodLabel.toLowerCase().replace(/\s+/g, "-")}.pdf`;
  doc.save(filename);
}
