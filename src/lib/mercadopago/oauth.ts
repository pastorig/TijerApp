import "server-only";

import crypto from "node:crypto";

/**
 * MercadoPago OAuth (Checkout Pro / "Vincular cuenta").
 *
 * TijerApp tiene UNA aplicación de MP (la de la plataforma) con client_id +
 * client_secret en env vars. El barbero conecta su cuenta con un clic; nunca
 * ve credenciales. El dinero va directo a la cuenta del barbero.
 */

const MP_AUTH_BASE = "https://auth.mercadopago.com.ar/authorization";
const MP_TOKEN_URL = "https://api.mercadopago.com/oauth/token";

function clientId() {
  return process.env.MP_CLIENT_ID || "";
}
function clientSecret() {
  return process.env.MP_CLIENT_SECRET || "";
}

export function isOAuthConfigured() {
  return Boolean(clientId() && clientSecret());
}

/* ── State firmado (CSRF + a qué barbería corresponde) ──────────────────── */

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos

function b64url(input: string) {
  return Buffer.from(input).toString("base64url");
}

/**
 * state = "<payload>.<hmac>" donde payload = base64url("slug:expMs").
 * Firmado con HMAC-SHA256 usando el client_secret. Así el callback confía en
 * la barbería sin necesidad de sesión, y no se puede falsificar.
 */
export function signState(slug: string): string {
  const payload = b64url(`${slug}:${Date.now() + STATE_TTL_MS}`);
  const hmac = crypto
    .createHmac("sha256", clientSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${hmac}`;
}

export function verifyState(
  state: string,
): { ok: true; slug: string } | { ok: false; reason: string } {
  const [payload, hmac] = state.split(".");
  if (!payload || !hmac) return { ok: false, reason: "formato" };
  const expected = crypto
    .createHmac("sha256", clientSecret())
    .update(payload)
    .digest("base64url");
  // Comparación en tiempo constante.
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "firma" };
  }
  let decoded = "";
  try {
    decoded = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return { ok: false, reason: "payload" };
  }
  const [slug, expStr] = decoded.split(":");
  const exp = Number(expStr);
  if (!slug || !Number.isFinite(exp)) return { ok: false, reason: "payload" };
  if (Date.now() > exp) return { ok: false, reason: "expirado" };
  return { ok: true, slug };
}

/* ── URL de autorización ─────────────────────────────────────────────────── */

export function buildAuthorizationUrl(slug: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    response_type: "code",
    platform_id: "mp",
    state: signState(slug),
    redirect_uri: redirectUri,
  });
  return `${MP_AUTH_BASE}?${params.toString()}`;
}

/* ── Intercambio de code y refresh ───────────────────────────────────────── */

export type MPTokenResponse = {
  access_token: string;
  refresh_token: string;
  public_key: string;
  user_id: number | string;
  expires_in: number; // segundos
};

export type TokenResult =
  | { ok: true; token: MPTokenResponse }
  | { ok: false; error: string };

async function postToken(body: Record<string, string>): Promise<TokenResult> {
  try {
    const res = await fetch(MP_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const err = (await res.json()) as { message?: string; error?: string };
        message = err.message ?? err.error ?? message;
      } catch {
        /* noop */
      }
      return { ok: false, error: message };
    }
    const data = (await res.json()) as MPTokenResponse;
    if (!data.access_token) {
      return { ok: false, error: "Respuesta sin access_token." };
    }
    return { ok: true, token: data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<TokenResult> {
  return postToken({
    client_id: clientId(),
    client_secret: clientSecret(),
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
}

export function refreshAccessToken(refreshToken: string): Promise<TokenResult> {
  return postToken({
    client_id: clientId(),
    client_secret: clientSecret(),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

/** ISO de vencimiento a partir de expires_in (segundos). */
export function expiresAtFrom(expiresInSeconds: number): string {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}
