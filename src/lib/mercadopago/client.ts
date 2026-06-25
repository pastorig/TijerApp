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

/* ────────────────────────────────────────────────────────────────────────
 * Checkout Pro — preferences
 * ──────────────────────────────────────────────────────────────────────── */

export type CreatePreferenceParams = {
  /** Título del ítem en el checkout (ej "Seña - Corte en SV Barber"). */
  title: string;
  /** Monto de la seña en ARS. */
  amount: number;
  /** ID del turno; viaja en external_reference para reconciliar el pago. */
  appointmentId: string;
  /** URL pública a la que MP notifica los pagos (incluye ?bs=<slug>). */
  notificationUrl: string;
  /** URL a la que vuelve el cliente tras pagar (vista del turno). */
  backUrl: string;
  /** Vencimiento del pago en ISO (MP cierra la preference en esa fecha). */
  expiresAt?: string;
  /** Email del pagador, opcional (mejora la UX del checkout). */
  payerEmail?: string | null;
};

export type CreatePreferenceResult =
  | { ok: true; preferenceId: string; initPoint: string }
  | { ok: false; error: string; statusCode?: number };

const MP_PREFERENCES_URL = `${MP_API_BASE}/checkout/preferences`;

/**
 * Crea una preference de Checkout Pro con el access_token de la barbería.
 * El dinero va directo a la cuenta de esa barbería. Devuelve el init_point
 * (link al checkout) y el id de la preference.
 */
export async function createDepositPreference(
  accessToken: string,
  params: CreatePreferenceParams,
): Promise<CreatePreferenceResult> {
  try {
    const body: Record<string, unknown> = {
      items: [
        {
          title: params.title,
          quantity: 1,
          unit_price: params.amount,
          currency_id: "ARS",
        },
      ],
      external_reference: params.appointmentId,
      notification_url: params.notificationUrl,
      back_urls: {
        success: params.backUrl,
        pending: params.backUrl,
        failure: params.backUrl,
      },
      auto_return: "approved",
    };

    if (params.payerEmail) {
      body.payer = { email: params.payerEmail };
    }

    if (params.expiresAt) {
      body.expires = true;
      body.expiration_date_to = params.expiresAt;
    }

    const res = await fetch(MP_PREFERENCES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const errBody = (await res.json()) as {
          message?: string;
          error?: string;
        };
        message = errBody.message ?? errBody.error ?? message;
      } catch {
        /* noop */
      }
      return { ok: false, error: message, statusCode: res.status };
    }

    const data = (await res.json()) as { id?: string; init_point?: string };
    if (!data.id || !data.init_point) {
      return { ok: false, error: "Respuesta inválida de MercadoPago." };
    }
    return { ok: true, preferenceId: data.id, initPoint: data.init_point };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export type MPPayment = {
  id: number;
  status: string; // approved | pending | rejected | ...
  status_detail: string;
  external_reference: string | null;
  transaction_amount: number | null;
};

export type GetPaymentResult =
  | { ok: true; payment: MPPayment }
  | { ok: false; error: string; statusCode?: number };

/**
 * Consulta el estado real de un pago contra MP usando el access_token de la
 * barbería. Es la fuente de verdad del webhook (no confiamos en el payload).
 */
export async function getPayment(
  accessToken: string,
  paymentId: string,
): Promise<GetPaymentResult> {
  try {
    const res = await fetch(`${MP_API_BASE}/v1/payments/${paymentId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const errBody = (await res.json()) as {
          message?: string;
          error?: string;
        };
        message = errBody.message ?? errBody.error ?? message;
      } catch {
        /* noop */
      }
      return { ok: false, error: message, statusCode: res.status };
    }

    const data = (await res.json()) as MPPayment;
    return { ok: true, payment: data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Reconstruye el init_point (link de pago) de una preference ya creada.
 * Se usa para reintentar el pago desde /r/[token] o desde un recordatorio,
 * sin tener que guardar el link en la DB.
 */
export async function getPreferenceInitPoint(
  accessToken: string,
  preferenceId: string,
): Promise<{ ok: true; initPoint: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${MP_PREFERENCES_URL}/${preferenceId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { init_point?: string };
    if (!data.init_point) {
      return { ok: false, error: "Sin init_point en la preference." };
    }
    return { ok: true, initPoint: data.init_point };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
