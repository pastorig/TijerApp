import "server-only";

/**
 * Mercado Pago — helpers de bajo nivel
 *
 * Por barbería usamos el access_token específico de esa barbería (cada una
 * tiene su propia cuenta MP, el dinero va directo a ellos). No hay un
 * access_token global de TijerApp.
 *
 * MVP: las llamadas a la API REST se hacen con fetch nativo en vez del SDK
 * oficial para mantener el bundle chico y tener control total del request.
 * Si la complejidad crece, migrar a `mercadopago` SDK npm.
 */

const MP_API_BASE = "https://api.mercadopago.com";

export type MPUserInfo = {
  id: number;
  nickname: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  country_id: string;
  site_id: string;
};

export type MPTestResult =
  | { ok: true; user: MPUserInfo }
  | { ok: false; error: string; statusCode?: number };

/**
 * Pinga el endpoint /users/me de MP con el access_token. Sirve para validar
 * que el token sea válido y que la cuenta esté activa. Devuelve info básica
 * del usuario para mostrar al admin "conectado como X".
 */
export async function testMPConnection(
  accessToken: string,
): Promise<MPTestResult> {
  try {
    const res = await fetch(`${MP_API_BASE}/users/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      // MP devuelve 401 si el token es inválido, 403 si no tiene scope
      let message = `HTTP ${res.status}`;
      try {
        const body = (await res.json()) as { message?: string; error?: string };
        message = body.message ?? body.error ?? message;
      } catch {
        /* noop */
      }
      return { ok: false, error: message, statusCode: res.status };
    }

    const data = (await res.json()) as MPUserInfo;
    return { ok: true, user: data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
