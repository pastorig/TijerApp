/**
 * Activación desde crmsaas (contrato de activación v1): lógica pura.
 *
 * El CRM registra un pago y TijerApp activa la barbería hasta la fecha pagada.
 * Acá se decide qué pedido es válido **antes** de tocar la base, y se calcula
 * el hash con el que la RPC distingue una repetición de un pedido distinto.
 *
 * El importe viaja como texto y se normaliza como texto: el punto flotante
 * pierde centavos.
 */
import { createHash } from "node:crypto";

export const ACTIVATION_METHODS = ["transferencia", "efectivo", "mercadopago", "otro"] as const;
export type ActivationMethod = (typeof ACTIVATION_METHODS)[number];

export type ActivationRequest = {
  commandId: string;
  accountExternalId: string;
  /** Con dos decimales: "12000.00". */
  amount: string;
  currency: "ARS";
  method: ActivationMethod;
  reference: string | null;
  /** ISO en UTC. */
  paidAt: string;
  coverageStart: string;
  /** Pagado hasta. */
  coverageEnd: string;
};

export type ParseResult =
  | { ok: true; data: ActivationRequest }
  | { ok: false; fields: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMPORTE = /^\d{1,10}(\.\d{1,2})?$/;
const MAX_REFERENCIA = 120;

function normalizarImporte(texto: string): string | null {
  if (!IMPORTE.test(texto)) return null;
  const [entera, decimal = ""] = texto.split(".");
  const enteraLimpia = entera.replace(/^0+(?=\d)/, "");
  const normalizado = `${enteraLimpia}.${`${decimal}00`.slice(0, 2)}`;
  return normalizado === "0.00" ? null : normalizado;
}

function fechaIso(valor: unknown): string | null {
  if (typeof valor !== "string" || valor.trim() === "") return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

export function parseActivationBody(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, fields: { body: "Tiene que ser un objeto JSON." } };
  }
  const b = body as Record<string, unknown>;
  const fields: Record<string, string> = {};

  if (b.contractVersion !== 1) fields.contractVersion = "Sólo se acepta la versión 1.";

  const commandId = typeof b.commandId === "string" ? b.commandId.trim() : "";
  if (!UUID.test(commandId)) fields.commandId = "Tiene que ser un uuid.";

  const accountExternalId =
    typeof b.accountExternalId === "string" ? b.accountExternalId.trim() : "";
  if (!UUID.test(accountExternalId)) fields.accountExternalId = "Tiene que ser el id de la barbería.";

  const amount = typeof b.amount === "string" ? normalizarImporte(b.amount.trim()) : null;
  if (amount === null) fields.amount = "Importe mayor que cero, como texto, con hasta dos decimales.";

  if (b.currency !== "ARS") fields.currency = "TijerApp sólo cobra en ARS.";

  const method = b.method;
  if (typeof method !== "string" || !(ACTIVATION_METHODS as readonly string[]).includes(method)) {
    fields.method = `Uno de: ${ACTIVATION_METHODS.join(", ")}.`;
  }

  let reference: string | null = null;
  if (b.reference !== undefined && b.reference !== null) {
    if (typeof b.reference !== "string") {
      fields.reference = "Tiene que ser texto.";
    } else {
      const recortada = b.reference.trim();
      if (recortada.length > MAX_REFERENCIA) fields.reference = `Hasta ${MAX_REFERENCIA} caracteres.`;
      else reference = recortada || null;
    }
  }

  const paidAt = fechaIso(b.paidAt);
  if (!paidAt) fields.paidAt = "Fecha ISO 8601.";
  const coverageStart = fechaIso(b.coverageStart);
  if (!coverageStart) fields.coverageStart = "Fecha ISO 8601.";
  const coverageEnd = fechaIso(b.coverageEnd);
  if (!coverageEnd) fields.coverageEnd = "Fecha ISO 8601.";
  else if (coverageStart && coverageEnd <= coverageStart) {
    fields.coverageEnd = "Tiene que ser posterior al inicio de la cobertura.";
  }

  if (Object.keys(fields).length > 0) return { ok: false, fields };

  return {
    ok: true,
    data: {
      commandId: commandId.toLowerCase(),
      accountExternalId: accountExternalId.toLowerCase(),
      amount: amount!,
      currency: "ARS",
      method: method as ActivationMethod,
      reference,
      paidAt: paidAt!,
      coverageStart: coverageStart!,
      coverageEnd: coverageEnd!,
    },
  };
}

/**
 * Hash del contenido ya normalizado, con orden de campos fijo.
 *
 * Se calcula sobre lo normalizado a propósito: "12000" y "12000.00" son el
 * mismo pedido, y un reintento del CRM no puede chocar por cómo lo escribió.
 */
export function requestHashOf(data: ActivationRequest): string {
  const canonico = JSON.stringify([
    data.commandId,
    data.accountExternalId,
    data.amount,
    data.currency,
    data.method,
    data.reference,
    data.paidAt,
    data.coverageStart,
    data.coverageEnd,
  ]);
  return createHash("sha256").update(canonico).digest("hex");
}

/** Los dos errores que la RPC levanta a propósito. El resto es un 500. */
export function rpcErrorResponse(
  message: string,
): { status: 404 | 409; error: "account_not_found" | "command_conflict" } | null {
  if (message === "account_not_found") return { status: 404, error: "account_not_found" };
  if (message === "command_conflict") return { status: 409, error: "command_conflict" };
  return null;
}
