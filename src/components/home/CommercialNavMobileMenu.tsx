"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui";
import { useDialogFocus } from "@/hooks/useDialogFocus";

/**
 * Menú de la nav comercial en celular.
 *
 * Antes la nav apilaba Producto / Precios / Iniciar sesión / Empezá gratis en
 * una sola fila: a 375px pedía 442px de ancho, así que el CTA principal
 * quedaba cortado fuera de la pantalla. Acá los links secundarios pasan a un
 * panel lateral y en la barra queda solo el CTA + este botón.
 *
 * Sigue el patrón de drawer del admin (`AdminSidebar`): overlay que oscurece y
 * panel que entra con transform. Solo existe en mobile — desde `sm` la nav
 * muestra todos los links y este componente se oculta.
 *
 * **El overlay y el panel se montan por portal en `document.body`, no acá.** La
 * nav tiene `backdrop-blur`, y `backdrop-filter` convierte al elemento en bloque
 * contenedor de sus descendientes `position: fixed`: el panel quedaba encajonado
 * en los ~68px de alto de la nav, con su contenido desbordando sobre la home.
 * Sacarlo del subárbol de la nav es lo que hace que `fixed inset-y-0` vuelva a
 * medirse contra el viewport.
 */

const LINKS = [
  { href: "/producto", label: "Producto" },
  { href: "/precios", label: "Precios" },
  { href: "/primebarber", label: "Ver demo" },
] as const;

export function CommercialNavMobileMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Escape cierra el panel — mismo gesto que espera cualquiera que abrió un
  // menú sin querer.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Con el panel abierto, el fondo no scrollea: si no, el dedo mueve la home
  // por detrás del menú. El mismo hook mete el foco en el panel (primer link),
  // no deja que Tab se vaya a la home tapada y, al cerrar, lo devuelve al botón
  // que abrió. El bloqueo de scroll vive ahí y no acá: dos efectos guardando y
  // restaurando el mismo `overflow` lo dejan trabado en "hidden".
  const panelRef = useDialogFocus<HTMLDivElement>(open);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] text-white transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>

      {/* Solo se monta abierto, y fuera de la nav (ver el comentario de arriba).
          Al no existir cerrado, tampoco hay links invisibles en el orden de
          tabulación — que era para lo que antes se usaba `hidden`. */}
      {open
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
              />

              <div
                ref={panelRef}
                id={panelId}
                className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col border-l border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] px-5 py-5 shadow-2xl sm:hidden"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-normal text-[color:var(--brand-gold)]">
                    Menú
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Cerrar menú"
                    className="inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>

                <nav className="mt-6 flex flex-col gap-1">
                  {LINKS.map((link, index) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      data-autofocus={index === 0 ? "" : undefined}
                      onClick={() => setOpen(false)}
                      className="inline-flex min-h-12 items-center rounded-[var(--radius-sm)] px-3 text-sm font-bold uppercase tracking-normal text-white transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--brand-gold)]"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                <div className="mt-auto flex flex-col gap-2 border-t border-[color:var(--border-subtle)] pt-5">
                  <Button
                    as="link"
                    href="/login"
                    variant="secondary"
                    size="md"
                    fullWidth
                    onClick={() => setOpen(false)}
                  >
                    Iniciar sesión
                  </Button>
                  <Button
                    as="link"
                    href="/registro"
                    size="md"
                    fullWidth
                    onClick={() => setOpen(false)}
                  >
                    Empezá gratis
                  </Button>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
