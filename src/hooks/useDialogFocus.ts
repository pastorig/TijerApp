"use client";

import { useEffect, useRef } from "react";

type DialogFocusOptions = {
  /**
   * Qué hacer con Escape. Es opcional: los modales del empleado ya lo manejan
   * por su cuenta. Pasar `undefined` lo apaga (por ejemplo, mientras guarda).
   */
  onEscape?: () => void;
};

const FOCUSABLE =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]';

/**
 * Lo que un diálogo modal le debe al teclado: el foco entra al abrir, Tab no se
 * escapa al contenido de atrás, el fondo no scrollea y, al cerrar, el foco
 * vuelve a donde estaba.
 *
 * Devuelve el ref que va en el contenedor del diálogo. El foco inicial cae en el
 * elemento marcado con `data-autofocus`; si no hay, en el primer control.
 *
 * Sirve igual si el modal se monta ya abierto (`{open ? <Modal /> : null}`): el
 * efecto corre en el montaje y limpia en el desmontaje.
 */
export function useDialogFocus<T extends HTMLElement = HTMLElement>(
  open: boolean,
  options: DialogFocusOptions = {},
) {
  const dialogRef = useRef<T>(null);

  // El callback suele ser una función nueva en cada render. Se guarda en un ref
  // para que cambiarlo no desarme y rearme la trampa (eso movería el foco al
  // primer control en medio de la carga de un formulario).
  const onEscapeRef = useRef(options.onEscape);
  useEffect(() => {
    onEscapeRef.current = options.onEscape;
  });

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const controls = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.getClientRects().length > 0,
      );
    (
      dialog.querySelector<HTMLElement>("[data-autofocus]") ??
      controls()[0] ??
      dialog
    ).focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onEscapeRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      // Diálogo abierto pero oculto por CSS (el menú mobile al pasar a
      // escritorio): no hay nada que contener, y atrapar Tab dejaría el
      // teclado muerto.
      if (dialog.getClientRects().length === 0) return;
      const elements = controls();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  return dialogRef;
}
