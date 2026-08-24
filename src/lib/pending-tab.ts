/**
 * Abrir una pestaña DESPUÉS de esperar una respuesta del servidor.
 *
 * ── El problema ─────────────────────────────────────────────────────────────
 * Los navegadores solo dejan abrir una pestaña mientras dura el "gesto del
 * usuario" que la pidió. Ese permiso se pierde apenas hay un `await`: Safari
 * lo corta de una, y Chrome lo mantiene unos segundos nomás. Entonces esto:
 *
 *     onSubmit → await fetch(...) → window.open(whatsapp)   ❌ bloqueado
 *
 * falla justo cuando la red está lenta, que es cuando el usuario más necesita
 * que funcione. En TijerApp eso dejaba al cliente en la pantalla de "listo"
 * sin que se abriera WhatsApp, teniendo que buscar el botón de reabrir.
 *
 * ── La salida ───────────────────────────────────────────────────────────────
 * Se abre la pestaña **en el momento del click**, todavía en blanco, y recién
 * cuando llega la respuesta se la manda a la URL final. El permiso se pidió
 * cuando correspondía; después solo se navega una pestaña que ya es nuestra.
 *
 * Si el flujo termina mal y nadie la usa, se cierra sola: nadie se queda con
 * una pestaña en blanco dando vueltas.
 */

/** Cuánto espera una pestaña sin usar antes de cerrarse sola. */
const TTL_MS = 20_000;

export type PendingTab = {
  /** Manda la pestaña a la URL final. Si se perdió, abre una nueva. */
  go: (url: string) => void;
  /** Cierra la pestaña si nunca se usó. Llamable de más, no molesta. */
  cancel: () => void;
};

export function openPendingTab(): PendingTab {
  if (typeof window === "undefined") {
    return { go: () => {}, cancel: () => {} };
  }

  let tab: Window | null = null;
  try {
    // Sin `noopener`: con esa opción el navegador devuelve null y perdemos la
    // referencia, que es justamente lo que necesitamos. La contrapartida se
    // resuelve abajo, poniendo `opener` en null antes de navegar.
    tab = window.open("", "_blank");
  } catch {
    tab = null;
  }

  if (tab) {
    try {
      // Que no sea una pestaña en blanco muda mientras se espera la
      // respuesta. Se arma con la API del DOM y no con document.write: el
      // texto es fijo, pero no hace falta abrir esa puerta.
      const doc = tab.document;
      doc.title = "Abriendo WhatsApp…";
      const aviso = doc.createElement("p");
      aviso.textContent = "Abriendo WhatsApp…";
      aviso.setAttribute(
        "style",
        "margin:0;font:600 15px system-ui,sans-serif;color:#c8c8c8",
      );
      doc.body.setAttribute(
        "style",
        "margin:0;display:grid;place-items:center;height:100vh;background:#0d0d0d",
      );
      doc.body.appendChild(aviso);
    } catch {
      /* si el navegador no deja escribirla, queda en blanco y listo */
    }
  }

  let used = false;
  const timer = window.setTimeout(() => {
    if (!used) closeTab(tab);
  }, TTL_MS);

  return {
    go(url: string) {
      used = true;
      window.clearTimeout(timer);
      if (tab && !tab.closed) {
        // Cortar el vínculo antes de mandarla a un sitio de terceros.
        try {
          tab.opener = null;
        } catch {
          /* algunos navegadores no lo permiten; no es motivo para no abrir */
        }
        tab.location.replace(url);
        return;
      }
      // La pestaña no se pudo abrir o el usuario la cerró: se intenta igual.
      // Puede quedar bloqueado, y para eso está el botón de reabrir en la
      // pantalla de confirmación.
      window.open(url, "_blank", "noopener,noreferrer");
    },
    cancel() {
      if (used) return;
      used = true;
      window.clearTimeout(timer);
      closeTab(tab);
    },
  };
}

function closeTab(tab: Window | null) {
  try {
    if (tab && !tab.closed) tab.close();
  } catch {
    /* noop */
  }
}
