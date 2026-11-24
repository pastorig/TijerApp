"use client";

/**
 * Ingreso con Google (feature 040).
 *
 * Se usa el botón oficial de Google (Google Identity Services) en vez de la
 * redirección de Supabase por dos razones (specs/040 research.md R1):
 *  - la ventanita de Google dice "Ir a tijerapp.com" y no el dominio de
 *    Supabase, que en un barbero da desconfianza;
 *  - no hay ida y vuelta de páginas: la sesión queda en el mismo almacenamiento
 *    que usa el panel, también en la app instalada.
 *
 * Google devuelve un ID token y con él se abre la sesión de Supabase. El nonce
 * evita que un token robado se reuse: a Google va su SHA-256 y a Supabase el
 * valor original.
 */
import { getSupabaseClient } from "@/lib/supabase";

const SCRIPT_URL = "https://accounts.google.com/gsi/client";

type CredentialResponse = { credential?: string };

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: CredentialResponse) => void;
        nonce?: string;
        ux_mode?: "popup" | "redirect";
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          type?: "standard" | "icon";
          theme?: "outline" | "filled_blue" | "filled_black";
          size?: "large" | "medium" | "small";
          text?: "signin_with" | "signup_with" | "continue_with" | "signin";
          shape?: "rectangular" | "pill" | "circle" | "square";
          logo_alignment?: "left" | "center";
          width?: number;
          locale?: string;
        },
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

export function googleClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
}

let cargaDelScript: Promise<GoogleIdentity> | null = null;

/** Carga el script de Google una sola vez por página. */
export function cargarGoogle(): Promise<GoogleIdentity> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Solo en el navegador."));
  }
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (cargaDelScript) return cargaDelScript;

  cargaDelScript = new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) resolve(window.google);
      else reject(new Error("El script de Google cargó sin la API."));
    };
    script.onerror = () => {
      // Se permite reintentar en el próximo montaje (ej. volvió la conexión).
      cargaDelScript = null;
      reject(new Error("No cargó el script de Google."));
    };
    document.head.appendChild(script);
  });
  return cargaDelScript;
}

function aHex(bytes: ArrayBuffer | Uint8Array): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Nonce de un solo uso: `crudo` para Supabase, `hash` para Google. */
export async function crearNonce(): Promise<{ crudo: string; hash: string }> {
  const crudo = aHex(crypto.getRandomValues(new Uint8Array(32)));
  const hash = aHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(crudo)));
  return { crudo, hash };
}

/** Abre la sesión de Supabase con el token que devolvió Google. */
export async function entrarConTokenDeGoogle(token: string, nonceCrudo: string) {
  return getSupabaseClient().auth.signInWithIdToken({
    provider: "google",
    token,
    nonce: nonceCrudo,
  });
}
