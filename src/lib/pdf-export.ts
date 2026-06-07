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
    // Opcional: comparativa con período anterior
    previousRevenue?: number;
    previousCount?: number;
  };
  topServices: Array<{ name: string; count: number; revenue: number }>;
  topBarbers: Array<{
    name: string;
    count: number;
    revenue: number;
    averageTicket: number;
    cancellationRate: number; // 0-100
  }>;
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

  // Ticket promedio + comparativa
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Ticket promedio: ${formatARS(input.metrics.averageTicket)}`,
    margin,
    cursorY,
  );

  // Comparativa vs período anterior (si se proveyó)
  if (typeof input.metrics.previousRevenue === "number") {
    const change =
      input.metrics.previousRevenue > 0
        ? ((input.metrics.totalRevenue - input.metrics.previousRevenue) /
            input.metrics.previousRevenue) *
          100
        : 0;
    const sign = change >= 0 ? "+" : "";
    const color: [number, number, number] = change >= 0 ? [34, 139, 34] : [220, 38, 38];
    doc.setTextColor(...color);
    doc.setFont("helvetica", "bold");
    doc.text(
      `${sign}${change.toFixed(1)}% vs período anterior`,
      pageWidth - margin,
      cursorY,
      { align: "right" },
    );
  }
  cursorY += 24;

  // ─── SPARKLINE DE TENDENCIA POR DÍA ───────────────────────────────
  // Mini-gráfico de líneas mostrando ingresos por día. Util para ver
  // tendencia rápida sin mirar la tabla completa.
  if (input.byDay && input.byDay.length > 1) {
    drawSparkline({
      doc,
      x: margin,
      y: cursorY,
      width: pageWidth - margin * 2,
      height: 40,
      values: input.byDay.map((d) => d.revenue),
      label: "Ingresos por día",
    });
    cursorY += 56;
  }

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

  // ─── COMPARATIVA DETALLADA DE BARBEROS ────────────────────────────
  if (input.topBarbers.length > 0) {
    if (cursorY > 680) {
      doc.addPage();
      cursorY = 56;
    }
    doc.setTextColor(...DARK);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("COMPARATIVA POR BARBERO", margin, cursorY);
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      head: [["Barbero", "Turnos", "Ingresos", "Ticket prom.", "% Cancel."]],
      body: input.topBarbers.map((b) => [
        b.name,
        String(b.count),
        formatARS(b.revenue),
        formatARS(b.averageTicket),
        `${b.cancellationRate.toFixed(1)}%`,
      ]),
      theme: "grid",
      headStyles: { fillColor: GOLD, textColor: DARK, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 6 },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
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

/**
 * Dibuja un sparkline (mini-gráfico de líneas) en el PDF.
 * Útil para visualizar tendencia de una serie temporal sin tablas.
 */
function drawSparkline(opts: {
  doc: jsPDF;
  x: number;
  y: number;
  width: number;
  height: number;
  values: number[];
  label?: string;
}): void {
  const { doc, x, y, width, height, values, label } = opts;
  if (values.length === 0) return;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  // Label arriba
  if (label) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, y - 2);
  }

  // Frame sutil
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, height);

  // Línea principal
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.5);

  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  for (let i = 1; i < values.length; i++) {
    const x1 = x + (i - 1) * stepX;
    const y1 = y + height - ((values[i - 1] - min) / range) * height;
    const x2 = x + i * stepX;
    const y2 = y + height - ((values[i] - min) / range) * height;
    doc.line(x1, y1, x2, y2);
  }

  // Punto en último valor para destacar
  const lastIdx = values.length - 1;
  const lastX = x + lastIdx * stepX;
  const lastY = y + height - ((values[lastIdx] - min) / range) * height;
  doc.setFillColor(...GOLD);
  doc.circle(lastX, lastY, 2, "F");
}
