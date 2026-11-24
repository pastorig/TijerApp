"use client";

import { useEffect } from "react";

/**
 * Mantiene quieto el documento en el panel del celular: el scroll va por
 * adentro de `.tj-panel-scroll` (feature 041, portado de Dentidad).
 *
 * En el iPhone, al enfocar un campo (o al cerrarse el teclado) Safari corre la
 * página para mostrarlo y a veces no la devuelve: la barra de arriba quedaba
 * escondida bajo la hora hasta cerrar la app. Esto la devuelve arriba apenas se
 * mueve, salvo mientras se escribe. Solo en el celular: en la compu el panel
 * sigue scrolleando el documento.
 */
export function useLockDocumentScroll() {
  useEffect(() => {
    const celular = window.matchMedia("(max-width: 767.98px)");

    function volverArriba() {
      if (!celular.matches) return;
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
    }
    function alSoltarFoco() {
      window.setTimeout(volverArriba, 50);
    }
    function alMoverDocumento() {
      const activo = document.activeElement;
      const escribiendo =
        activo instanceof HTMLInputElement ||
        activo instanceof HTMLTextAreaElement ||
        activo instanceof HTMLSelectElement ||
        (activo instanceof HTMLElement && activo.isContentEditable);
      if (!escribiendo) volverArriba();
    }

    window.addEventListener("scroll", alMoverDocumento, { passive: true });
    document.addEventListener("focusout", alSoltarFoco);
    window.visualViewport?.addEventListener("resize", alMoverDocumento);
    volverArriba();
    return () => {
      window.removeEventListener("scroll", alMoverDocumento);
      document.removeEventListener("focusout", alSoltarFoco);
      window.visualViewport?.removeEventListener("resize", alMoverDocumento);
    };
  }, []);
}
