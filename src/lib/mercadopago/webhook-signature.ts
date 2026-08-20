import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Validación de la firma de los webhooks de MercadoPago.
 *
 * MercadoPago manda dos cabeceras: `x-signature` (con `ts=<epoch>,v1=<hmac>`)
 * y `x-request-id`. El HMAC es SHA-256 sobre el manifiesto
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` usando la clave secreta de
 * la aplicación, la que se genera en el panel de MP.
 *
 * Vive aparte del route handler porque es lógica pura: así se puede testear
 * sin levantar Next ni pegarle a MercadoPago.
 *
 * ── Por qué esto es una segunda capa y no la principal ──────────────────────
 * El webhook nunca le cree al payload: vuelva a consultar el pago real contra
 * la API de MP antes de tocar nada. O sea que una notificación falsa ya no
 * lograba confirmar un turno. La firma agrega que ni siquiera lleguemos a
 * hacer esa consulta con datos de un tercero.
 *
 * ── Por qué no se valida el `ts` contra la hora actual ──────────────────────
 * La tentación es rechazar firmas viejas (anti-replay). No conviene: MP
 * reintenta las notificaciones durante horas, y un turno confirmado tarde es
 * mucho peor que un replay — que además es inofensivo acá, porque el handler
 * es idempotente y re-consulta el estado real.
 */

export type SignatureVerdict =
  /** No hay secreto configurado: no se valida nada (ver `MP_WEBHOOK_SECRET`). */
  | { ok: true; reason: "sin-secreto" }
  | { ok: true; reason: "firma-valida" }
  | { ok: false; reason: "faltan-cabeceras" }
  | { ok: false; reason: "firma-no-coincide" };

/** Parsea `ts=1699999999,v1=abc123` → { ts, v1 }. */
function parseSignatureHeader(header: string): { ts?: string; v1?: string } {
  const out: { ts?: string; v1?: string } = {};
  for (const part of header.split(",")) {
    const [rawKey, ...rest] = part.split("=");
    const key = rawKey?.trim();
    const value = rest.join("=").trim();
    if (key === "ts") out.ts = value;
    if (key === "v1") out.v1 = value;
  }
  return out;
}

/** Compara dos hex sin filtrar información por el tiempo que tarda. */
function equalsConstantTime(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  // timingSafeEqual explota si los largos difieren; ese caso ya es un "no".
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyWebhookSignature({
  signatureHeader,
  requestIdHeader,
  dataId,
  secret,
}: {
  signatureHeader: string | null;
  requestIdHeader: string | null;
  dataId: string;
  secret: string | undefined;
}): SignatureVerdict {
  // Sin secreto la validación queda inerte a propósito: prenderla a medias
  // rompería el cobro de seña de toda barbería que ya esté cobrando.
  if (!secret) return { ok: true, reason: "sin-secreto" };

  if (!signatureHeader || !dataId) return { ok: false, reason: "faltan-cabeceras" };

  const { ts, v1 } = parseSignatureHeader(signatureHeader);
  if (!ts || !v1) return { ok: false, reason: "faltan-cabeceras" };

  // MP documenta que si el id es alfanumérico va en minúsculas.
  const id = /^[0-9]+$/.test(dataId) ? dataId : dataId.toLowerCase();
  const manifest = `id:${id};request-id:${requestIdHeader ?? ""};ts:${ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  return equalsConstantTime(expected, v1)
    ? { ok: true, reason: "firma-valida" }
    : { ok: false, reason: "firma-no-coincide" };
}
