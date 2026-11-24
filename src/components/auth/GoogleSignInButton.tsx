"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Copy, ExternalLink } from "lucide-react";
import {
  cargarGoogle,
  crearNonce,
  entrarConTokenDeGoogle,
  googleClientId,
} from "@/lib/google-signin";
import { esNavegadorEmbebido } from "@/lib/navegador-embebido";

type Props = {
  /** Qué dice el botón: "Continuar con Google" o "Registrarse con Google". */
  texto?: "continue_with" | "signup_with";
  /** Se llama con la sesión ya abierta; decide a dónde va. */
  onIngreso: () => Promise<void> | void;
  /** Avisa al formulario que se está entrando (para deshabilitar el resto). */
  onOcupado?: (ocupado: boolean) => void;
};

/**
 * Botón "Continuar con Google" (feature 040). Usa el diseño oficial de Google
 * en su variante oscura: Google exige su botón, y el negro es el que convive
 * con la paleta de TijerApp.
 *
 * Sin `NEXT_PUBLIC_GOOGLE_CLIENT_ID` no se muestra nada: el formulario de mail
 * sigue siendo la forma de entrar.
 */
export function GoogleSignInButton({ texto = "continue_with", onIngreso, onOcupado }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  // En el servidor no hay user agent: ahí se asume navegador normal y en el
  // cliente se lee el real, sin desfasar la hidratación.
  const embebido = useSyncExternalStore(
    sinSuscripcion,
    () => esNavegadorEmbebido(navigator.userAgent),
    () => false,
  );
  const [estado, setEstado] = useState<"cargando" | "listo" | "entrando" | "sin-google">("cargando");
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);
  // Los callbacks cambian en cada render del padre; el de Google se registra
  // una sola vez, así que lee siempre la última versión desde acá.
  const onIngresoRef = useRef(onIngreso);
  const onOcupadoRef = useRef(onOcupado);
  useEffect(() => {
    onIngresoRef.current = onIngreso;
    onOcupadoRef.current = onOcupado;
  });

  const clientId = googleClientId();

  useEffect(() => {
    if (embebido || !clientId) return;

    let cancelado = false;
    (async () => {
      try {
        const [google, nonce] = await Promise.all([cargarGoogle(), crearNonce()]);
        if (cancelado || !contenedor.current) return;

        google.accounts.id.initialize({
          client_id: clientId,
          nonce: nonce.hash,
          ux_mode: "popup",
          auto_select: false,
          callback: async (respuesta) => {
            if (!respuesta.credential) {
              setError("No pudimos entrar con Google. Probá de nuevo o entrá con tu mail.");
              return;
            }
            setError("");
            setEstado("entrando");
            onOcupadoRef.current?.(true);
            try {
              const { error: errorDeSesion } = await entrarConTokenDeGoogle(
                respuesta.credential,
                nonce.crudo,
              );
              if (errorDeSesion) throw errorDeSesion;
              await onIngresoRef.current();
            } catch {
              setError("No pudimos entrar con Google. Probá de nuevo o entrá con tu mail.");
            } finally {
              // Si navegó, esto no se llega a ver. Si se quedó en la pantalla
              // (elegir barbería, un aviso), el botón tiene que volver a estar.
              setEstado("listo");
              onOcupadoRef.current?.(false);
            }
          },
        });

        const ancho = Math.min(400, Math.max(200, Math.floor(contenedor.current.clientWidth)));
        google.accounts.id.renderButton(contenedor.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          text: texto,
          shape: "rectangular",
          logo_alignment: "center",
          width: ancho,
          locale: "es-419",
        });
        setEstado("listo");
      } catch {
        if (!cancelado) setEstado("sin-google");
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [clientId, texto, embebido]);

  if (!clientId) return null;

  if (embebido) {
    return (
      <div className="mt-6 rounded-md border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
        <p className="flex items-start gap-2 font-semibold text-[color:var(--brand-gold)]">
          <ExternalLink className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Para entrar con Google abrí esta página en Chrome o Safari.
        </p>
        <p className="mt-1">
          Tocá los tres puntitos de arriba → &quot;Abrir en el navegador&quot;, o copiá el link.
        </p>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              setCopiado(true);
            } catch {
              setCopiado(false);
            }
          }}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-[color:var(--border-default)] bg-black px-4 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:border-[color:var(--brand-gold)]"
        >
          <Copy className="size-4" aria-hidden="true" />
          {copiado ? "Link copiado" : "Copiar link"}
        </button>
      </div>
    );
  }

  if (estado === "sin-google") return null;

  return (
    <div className="mt-6">
      <div className="relative">
        {/* Alto reservado: el botón de Google aparece cuando carga su script y
            así el formulario de abajo no salta. */}
        <div ref={contenedor} className="flex min-h-11 w-full justify-center" />
        {estado === "entrando" ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black text-sm font-semibold text-[color:var(--text-secondary)]">
            Entrando…
          </div>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-[color:var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** El user agent no cambia durante la visita: no hay nada a qué suscribirse. */
function sinSuscripcion() {
  return () => {};
}

/** Separador entre el botón de Google y el formulario de mail. */
export function SeparadorDeIngreso() {
  if (!googleClientId()) return null;
  return (
    <div className="mt-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-subtle)]">
      <span className="h-px flex-1 bg-[color:var(--border-subtle)]" />
      o con tu mail
      <span className="h-px flex-1 bg-[color:var(--border-subtle)]" />
    </div>
  );
}
