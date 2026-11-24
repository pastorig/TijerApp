"use client";

/**
 * La barra de abajo del empleado en el celular (feature 041, tanda 5): la
 * misma cápsula de vidrio que la del dueño, con sus 2 o 3 secciones y el ＋ de
 * "Turno nuevo" solo si el dueño le dio ese permiso. No tiene "Más": no hay
 * secciones que esconder.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { Plus, type LucideIcon } from "lucide-react";

/** Evento con el que el ＋ le pide a la agenda que abra "Turno nuevo". */
export const EVENTO_TURNO_NUEVO_STAFF = "tj:turno-nuevo-staff";

export type SeccionStaff = { href: string; label: string; icon: LucideIcon };

export function StaffBottomNav({
  secciones,
  agendaHref,
  puedeCargarTurno,
}: {
  secciones: SeccionStaff[];
  agendaHref: string;
  puedeCargarTurno: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const fila = useRef<HTMLDivElement>(null);
  const [pastilla, setPastilla] = useState<{ x: number; ancho: number } | null>(null);
  // El ＋ se centra sobre su hueco (con 3 secciones el hueco no cae en el medio).
  const hueco = useRef<HTMLSpanElement>(null);
  const [masX, setMasX] = useState<number | null>(null);
  const elegida = secciones.find((s) => s.href === pathname)?.href ?? null;

  useLayoutEffect(() => {
    function medir() {
      const el = elegida ? fila.current?.querySelector<HTMLElement>(`[data-nav="${elegida}"]`) : null;
      setPastilla(el ? { x: el.offsetLeft, ancho: el.offsetWidth } : null);
      const h = hueco.current;
      setMasX(h ? h.offsetLeft + h.offsetWidth / 2 : null);
    }
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [elegida]);

  function turnoNuevo() {
    if (pathname === agendaHref) window.dispatchEvent(new CustomEvent(EVENTO_TURNO_NUEVO_STAFF));
    else router.push(`${agendaHref}?nuevo=1`);
  }

  // Con ＋ va en el medio: la primera sección a la izquierda y el resto a la derecha.
  const izquierda = puedeCargarTurno ? secciones.slice(0, 1) : secciones;
  const derecha = puedeCargarTurno ? secciones.slice(1) : [];
  const columnas = secciones.length + (puedeCargarTurno ? 1 : 0);

  const item = (s: SeccionStaff) => {
    const Icon = s.icon;
    return (
      <Link
        key={s.href}
        href={s.href}
        data-nav={s.href}
        aria-current={s.href === pathname ? "page" : undefined}
        className="tj-nav-item"
      >
        <Icon className="size-[21px]" aria-hidden="true" />
        {s.label}
      </Link>
    );
  };

  return (
    <div className="md:hidden">
      <div className="tj-fumado-abajo" aria-hidden="true" />
      <div className="tj-nav-envoltura">
        <div className="relative w-full max-w-[440px]">
          <nav aria-label="Secciones" className="tj-nav">
            <div
              ref={fila}
              className="tj-nav-fila"
              style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
            >
              <span
                aria-hidden="true"
                className="tj-nav-pastilla"
                style={pastilla ? { width: pastilla.ancho, transform: `translateX(${pastilla.x}px)` } : { opacity: 0 }}
              />
              {izquierda.map(item)}
              {puedeCargarTurno ? <span ref={hueco} aria-hidden="true" /> : null}
              {derecha.map(item)}
            </div>
          </nav>
          {puedeCargarTurno ? (
            <button
              type="button"
              onClick={turnoNuevo}
              aria-label="Turno nuevo"
              className="tj-nav-mas tj-boton-oro"
              style={masX !== null ? { left: masX } : undefined}
            >
              <Plus className="size-[26px]" strokeWidth={2.6} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
