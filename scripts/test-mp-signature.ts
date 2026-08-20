/**
 * Tests de la validación de firma de los webhooks de MercadoPago (lógica pura).
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-mp-signature.ts
 */
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "../src/lib/mercadopago/webhook-signature.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(
    `${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${expected}, obtenido ${got}`}`,
  );
  if (ok) passed++;
  else failed++;
}

const SECRET = "clave-secreta-de-la-app";
const DATA_ID = "1234567890";
const REQUEST_ID = "a1b2c3d4-0000-4444-8888-abcdefabcdef";
const TS = "1755640000";

/** Firma como la arma MercadoPago del otro lado. */
function firmar({
  secret = SECRET,
  dataId = DATA_ID,
  requestId = REQUEST_ID,
  ts = TS,
}: {
  secret?: string;
  dataId?: string;
  requestId?: string;
  ts?: string;
} = {}) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

const base = {
  requestIdHeader: REQUEST_ID,
  dataId: DATA_ID,
  secret: SECRET,
};

check(
  "firma correcta → pasa",
  verifyWebhookSignature({ ...base, signatureHeader: firmar() }).ok,
  true,
);

check(
  "firmada con OTRA clave → no pasa",
  verifyWebhookSignature({
    ...base,
    signatureHeader: firmar({ secret: "clave-de-otro" }),
  }).ok,
  false,
);

check(
  "firma de otro pago (id distinto) → no pasa",
  verifyWebhookSignature({
    ...base,
    signatureHeader: firmar({ dataId: "9999999999" }),
  }).ok,
  false,
);

check(
  "cambiar el request-id invalida la firma",
  verifyWebhookSignature({
    ...base,
    signatureHeader: firmar(),
    requestIdHeader: "otro-request-id",
  }).ok,
  false,
);

check(
  "cambiar el ts invalida la firma",
  verifyWebhookSignature({
    ...base,
    signatureHeader: `ts=1755649999,v1=${firmar().split("v1=")[1]}`,
  }).ok,
  false,
);

check(
  "sin cabecera de firma → no pasa",
  verifyWebhookSignature({ ...base, signatureHeader: null }).ok,
  false,
);

check(
  "cabecera sin v1 → no pasa",
  verifyWebhookSignature({ ...base, signatureHeader: `ts=${TS}` }).ok,
  false,
);

check(
  "v1 que no es hex → no pasa (y no explota)",
  verifyWebhookSignature({ ...base, signatureHeader: `ts=${TS},v1=nada` }).ok,
  false,
);

// El caso que importa para no romper producción: hasta que exista la env var,
// la validación no puede rechazar nada.
check(
  "sin MP_WEBHOOK_SECRET → no valida y deja pasar",
  verifyWebhookSignature({ ...base, secret: undefined, signatureHeader: null })
    .reason,
  "sin-secreto",
);

// MP documenta que un id alfanumérico va en minúsculas en el manifiesto.
check(
  "id alfanumérico: se firma en minúsculas",
  verifyWebhookSignature({
    ...base,
    dataId: "AbC123xyz",
    signatureHeader: firmar({ dataId: "abc123xyz" }),
  }).ok,
  true,
);

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
