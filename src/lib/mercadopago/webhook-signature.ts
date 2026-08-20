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
 * ── Dos secretos, no uno ────────────────────────────────────────────────────
 * MP firma cada notificación con el secreto del modo que la generó. Los pagos
 * reales vienen firmados con el secreto **productivo**; los que se hacen con
 * usuarios de prueba, con el de **prueba**. Con un solo secreto cargado, la
 * prueba de punta a punta con usuarios de prueba se rechazaría con 401 — y
 * desde afuera eso se ve idéntico a "el cliente pagó y el turno no se
 * confirmó", que es justo el problema que esta validación viene a evitar.
 *
 * ── Por qué esto es una segunda capa y no la principal ──────────────────────
 * El webhook nunca le cree al payload: vuelve a consultar el pago real contra
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

export type SignatureMode = "produccion" | "prueba";

export type SignatureVerdict =
  /** No hay ningún secreto configurado: no se valida nada. */
  | { ok: true; reason: "sin-secreto" }
  | { ok: true; reason: "firma-valida"; modo: SignatureMode }
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
  secrets,
}: {
  signatureHeader: string | null;
  requestIdHeader: string | null;
  dataId: string;
  /** El productivo es el que valida los pagos reales. */
  secrets: { produccion?: string; prueba?: string };
}): SignatureVerdict {
  const candidatos: Array<{ modo: SignatureMode; secret: string }> = [];
  if (secrets.produccion) {
    candidatos.push({ modo: "produccion", secret: secrets.produccion });
  }
  if (secrets.prueba) {
    candidatos.push({ modo: "prueba", secret: secrets.prueba });
  }

  // Sin secretos la validación queda inerte a propósito: prenderla a medias
  // rompería el cobro de seña de toda barbería que ya esté cobrando.
  if (candidatos.length === 0) return { ok: true, reason: "sin-secreto" };

  if (!signatureHeader || !dataId) return { ok: false, reason: "faltan-cabeceras" };

  const { ts, v1 } = parseSignatureHeader(signatureHeader);
  if (!ts || !v1) return { ok: false, reason: "faltan-cabeceras" };

  // MP documenta que si el id es alfanumérico va en minúsculas.
  const id = /^[0-9]+$/.test(dataId) ? dataId : dataId.toLowerCase();
  const manifest = `id:${id};request-id:${requestIdHeader ?? ""};ts:${ts};`;

  for (const { modo, secret } of candidatos) {
    const expected = createHmac("sha256", secret).update(manifest).digest("hex");
    if (equalsConstantTime(expected, v1)) {
      return { ok: true, reason: "firma-valida", modo };
    }
  }

  return { ok: false, reason: "firma-no-coincide" };
}
