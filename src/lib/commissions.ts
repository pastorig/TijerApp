/**
 * Comisiones por barbero (feature 014).
 *
 * El panel ya sabe cuánto produjo cada barbero en el período. Acá se resuelve
 * cuánto de eso le corresponde y cuánto queda en la barbería.
 *
 * Función pura a propósito: el mismo número lo muestran la tabla de Reportes, el
 * PDF y el mensaje de WhatsApp. Si cada uno hiciera su cuenta, tarde o temprano
 * darían distinto — y un número distinto en la liquidación de un empleado es una
 * discusión con plata de por medio.
 */

export type BarberProduction = {
  barberId: string;
  name: string;
  /** Lo que produjo en el período, en pesos. */
  revenue: number;
  /**
   * Porcentaje que cobra. `null` = **sin configurar**, distinto de 0%: queda
   * fuera de la liquidación en vez de aparecer con $0.
   */
  commissionPercent: number | null;
};

export type CommissionRow = {
  barberId: string;
  name: string;
  revenue: number;
  commissionPercent: number;
  /** Lo que se lleva el barbero. */
  commission: number;
  /** Lo que queda en la barbería. Sale por RESTA (ver abajo). */
  barbershopShare: number;
};

export type CommissionSummary = {
  /** Barberos con comisión configurada, de mayor a menor comisión. */
  rows: CommissionRow[];
  /** Barberos sin comisión configurada: se listan aparte, no suman. */
  unconfigured: Array<{ barberId: string; name: string; revenue: number }>;
  totalRevenue: number;
  totalCommission: number;
  totalBarbershopShare: number;
};

/**
 * Calcula la liquidación del período.
 *
 * **Por qué la parte de la barbería sale por resta y no por su propio
 * porcentaje:** si se calcularan las dos puntas por separado (`total × pct` y
 * `total × (100-pct)`), con porcentajes como 33% o 47,5% y montos que no
 * dividen redondo quedan diferencias de pesos. El dueño las ve, no las puede
 * explicar, y desconfía del sistema entero. Calculando la comisión y restando,
 * la identidad `comisión + barbería = producido` se cumple **por construcción**.
 *
 * Por lo mismo, los totales se suman de las filas YA redondeadas: recalcularlos
 * sobre el total volvería a abrir el descalce.
 */
export function calculateCommissions(
  productions: BarberProduction[],
): CommissionSummary {
  const rows: CommissionRow[] = [];
  const unconfigured: CommissionSummary["unconfigured"] = [];

  for (const production of productions) {
    const revenue = Number.isFinite(production.revenue) ? production.revenue : 0;

    if (
      production.commissionPercent === null ||
      production.commissionPercent === undefined
    ) {
      unconfigured.push({
        barberId: production.barberId,
        name: production.name,
        revenue,
      });
      continue;
    }

    const percent = production.commissionPercent;
    const commission = Math.round((revenue * percent) / 100);

    rows.push({
      barberId: production.barberId,
      name: production.name,
      revenue,
      commissionPercent: percent,
      commission,
      // Por resta, nunca por su propio porcentaje.
      barbershopShare: revenue - commission,
    });
  }

  rows.sort((a, b) => b.commission - a.commission);

  // Totales por suma de filas ya redondeadas.
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalCommission = rows.reduce((sum, row) => sum + row.commission, 0);

  return {
    rows,
    unconfigured,
    totalRevenue,
    totalCommission,
    totalBarbershopShare: totalRevenue - totalCommission,
  };
}
