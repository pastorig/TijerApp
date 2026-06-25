/**
 * Cálculo del monto de seña — lógica pura, sin DB ni red, para poder testearla
 * aislada. El monto se cobra como un porcentaje del precio del servicio, con un
 * piso opcional (si el porcentaje queda por debajo del mínimo, se cobra el
 * mínimo).
 */

export type ComputeDepositInput = {
  /** Precio del servicio en ARS (entero). */
  servicePrice: number;
  /** Porcentaje de seña, 1–100. */
  depositPercent: number;
  /** Monto mínimo de seña en ARS, o null/undefined si no hay piso. */
  depositMinAmount?: number | null;
};

/**
 * Devuelve el monto de seña en ARS (entero, redondeado). Nunca supera el precio
 * del servicio. Si los datos son inválidos (precio o porcentaje <= 0) devuelve 0.
 */
export function computeDepositAmount({
  servicePrice,
  depositPercent,
  depositMinAmount,
}: ComputeDepositInput): number {
  if (
    !Number.isFinite(servicePrice) ||
    servicePrice <= 0 ||
    !Number.isFinite(depositPercent) ||
    depositPercent <= 0
  ) {
    return 0;
  }

  const byPercent = Math.round((servicePrice * depositPercent) / 100);
  const floor =
    typeof depositMinAmount === "number" && depositMinAmount > 0
      ? Math.floor(depositMinAmount)
      : 0;

  // El mayor entre porcentaje y mínimo, pero nunca más que el precio total.
  return Math.min(Math.max(byPercent, floor), Math.round(servicePrice));
}
