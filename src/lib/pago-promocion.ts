/**
 * Cobros a precio de promoción en el panel del owner.
 *
 * ── De dónde sale ───────────────────────────────────────────────────────────
 * "Registrar pago" avisa cuando el monto no coincide con ningún precio de
 * lista, porque el 12/08/2026 un pago de $22.000 se cargó como $22. Pero hay
 * precios que no son de lista a propósito: el 22/10/2026 Bautista quiso cargar
 * los $27.000 que paga Leo Cuts (Esencial con precio acordado) y el panel no
 * lo dejaba pasar.
 *
 * Un cobro marcado como promoción no pasa por ese aviso y queda identificado
 * en el historial. Se guarda como un prefijo en la nota, sin columna nueva:
 * así no hace falta migración y la marca viaja con el pago.
 */
export const PREFIJO_PROMOCION = "Promoción";

/** La nota que se guarda: el prefijo y, si hay, lo que escribió el owner. */
export function notaDePromocion(nota: string | null): string {
  const resto = nota?.trim();
  return resto ? `${PREFIJO_PROMOCION} · ${resto}` : PREFIJO_PROMOCION;
}

/** Separa la marca de la nota para mostrarlas por separado en el historial. */
export function leerNotaDePago(nota: string | null): {
  esPromocion: boolean;
  resto: string | null;
} {
  const texto = nota?.trim() ?? "";
  if (texto === PREFIJO_PROMOCION) return { esPromocion: true, resto: null };
  if (texto.startsWith(`${PREFIJO_PROMOCION} · `)) {
    return { esPromocion: true, resto: texto.slice(PREFIJO_PROMOCION.length + 3) || null };
  }
  return { esPromocion: false, resto: texto || null };
}
