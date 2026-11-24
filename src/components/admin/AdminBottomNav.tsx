"use client";

/**
 * La barra de abajo del panel en el celular (feature 041). Reemplaza a la
 * hamburguesa por debajo de 768 px.
 *
 * - Inicio · Turnero · ＋ · Clientes · Más. El ＋ abre "Turno nuevo".
 * - Una sola pastilla marca la sección y se desliza con rebote.
 * - "Más" no abre otra ventana: la misma cápsula crece hacia arriba con el
 *   resto de las secciones (las que el plan habilita). Se cierra bajándola con
 *   el dedo, con Escape, tocando afuera o eligiendo una sección.
 *
 * Mecánica portada de Dentidad (`bottom-nav.tsx`); estilos en vidrio.css.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ExternalLink, MoreHorizontal, Plus } from "lucide-react";
import { hasFeature, type Feature } from "@/lib/plans";
import { useCurrentPlan } from "./PlanContext";
import { itemIsActive } from "./admin-nav";
import { estaEnElMas, itemsDeLaBarra, seccionesDelMas } from "./bottom-nav-items";

/** Evento con el que el ＋ le pide al Turnero que abra "Turno nuevo". */
export const EVENTO_TURNO_NUEVO = "tj:turno-nuevo";

const ALTO_BARRA = 66;

export function AdminBottomNav({ barbershopSlug }: { barbershopSlug: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const plan = useCurrentPlan();
  const canUse = useCallback((feature: Feature) => hasFeature(plan.tier, feature), [plan.tier]);
  const base = `/${barbershopSlug}/admin`;

  const barra = itemsDeLaBarra(barbershopSlug, canUse);
  const secciones = seccionesDelMas(barbershopSlug, canUse);
  const masElegido = estaEnElMas(barbershopSlug, pathname, canUse);

  const [abierto, setAbierto] = useState(false);
  const [arrastre, setArrastre] = useState<number | null>(null);
  const [altoMas, setAltoMas] = useState(ALTO_BARRA);
  const contenido = useRef<HTMLDivElement>(null);
  const idMas = useId();

  // Al cambiar de sección se cierra solo.
  const [rutaAntes, setRutaAntes] = useState(pathname);
  if (rutaAntes !== pathname) {
    setRutaAntes(pathname);
    setAbierto(false);
  }

  // Cuánto crece: lo que mide el contenido, hasta el 86 % de la pantalla (si
  // no entra, lo de adentro scrollea).
  useLayoutEffect(() => {
    if (!abierto || !contenido.current) return;
    const alto = contenido.current.scrollHeight + ALTO_BARRA;
    setAltoMas(Math.min(alto, Math.round(window.innerHeight * 0.86)));
  }, [abierto, secciones.length]);

  useEffect(() => {
    if (!abierto) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAbierto(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto]);

  // ── La pastilla: mide el ítem elegido y se desliza hasta él ──
  const fila = useRef<HTMLDivElement>(null);
  const [pastilla, setPastilla] = useState<{ x: number; ancho: number } | null>(null);
  const elegido = abierto ? "mas" : masElegido ? "mas" : barra.find((i) => itemIsActive(i, pathname))?.href ?? null;
  useLayoutEffect(() => {
    function medir() {
      const el = elegido ? fila.current?.querySelector<HTMLElement>(`[data-nav="${elegido}"]`) : null;
      setPastilla(el ? { x: el.offsetLeft, ancho: el.offsetWidth } : null);
    }
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [elegido]);

  // ── Bajar el Más con el dedo ──
  const gesto = useRef<{ id: number; y0: number; t0: number } | null>(null);
  function apoyar(event: React.PointerEvent<HTMLDivElement>) {
    gesto.current = { id: event.pointerId, y0: event.clientY, t0: event.timeStamp };
  }
  function mover(event: React.PointerEvent<HTMLDivElement>) {
    const g = gesto.current;
    if (!g || g.id !== event.pointerId) return;
    const dy = event.clientY - g.y0;
    if (arrastre === null && Math.abs(dy) < 6) return;
    if (arrastre === null) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Sin captura, el gesto sigue mientras el dedo esté encima.
      }
    }
    setArrastre(Math.max(0, dy));
  }
  function soltar(event: React.PointerEvent<HTMLDivElement>) {
    const g = gesto.current;
    gesto.current = null;
    if (!g || g.id !== event.pointerId) return;
    const dy = event.clientY - g.y0;
    const velocidad = dy / Math.max(1, event.timeStamp - g.t0);
    setArrastre(null);
    if (dy > 90 || (dy > 12 && velocidad > 0.45)) setAbierto(false);
  }

  function turnoNuevo() {
    setAbierto(false);
    if (pathname.startsWith(`${base}/turnero`)) {
      window.dispatchEvent(new CustomEvent(EVENTO_TURNO_NUEVO));
    } else {
      router.push(`${base}/turnero?nuevo=1`);
    }
  }

  const alto = abierto ? Math.max(ALTO_BARRA, altoMas - (arrastre ?? 0)) : ALTO_BARRA;
  const veloOpacidad = arrastre !== null ? Math.max(0, 1 - arrastre / 360) : undefined;
  const etiqueta = (label: string, href: string) => (href === base ? "Inicio" : label);
  let indice = 0;

  return (
    <div className="md:hidden">
      <div
        aria-hidden="true"
        className={`tj-velo ${abierto ? "tj-velo--abierto" : ""} ${arrastre !== null ? "tj-velo--arrastre" : ""}`}
        style={veloOpacidad !== undefined ? { opacity: veloOpacidad } : undefined}
        onClick={() => setAbierto(false)}
      />
      <div className="tj-fumado-abajo" aria-hidden="true" />
      <div className="tj-nav-envoltura">
        <div className="relative w-full max-w-[440px]">
          <nav
            aria-label="Secciones del panel"
            className={`tj-nav tj-nav-crece ${abierto ? "tj-nav-crece--abierta" : ""} ${
              arrastre !== null ? "tj-nav-crece--arrastre" : ""
            }`}
            style={{ height: alto }}
          >
            <div
              ref={contenido}
              id={idMas}
              role="dialog"
              aria-label="Más secciones"
              aria-modal="false"
              inert={!abierto}
              className="tj-mas-contenido"
            >
              <div
                className="flex h-7 touch-none items-center justify-center"
                onPointerDown={apoyar}
                onPointerMove={mover}
                onPointerUp={soltar}
                onPointerCancel={() => {
                  gesto.current = null;
                  setArrastre(null);
                }}
                aria-hidden="true"
              >
                <span className="h-1 w-10 rounded-full bg-white/25" />
              </div>
              {secciones.map((seccion) => (
                <section key={seccion.titulo} className="mt-2">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                    {seccion.titulo}
                  </p>
                  <ul className="mt-2 grid grid-cols-4 gap-x-1 gap-y-3">
                    {seccion.items.map((item) => {
                      const Icon = item.icon;
                      const actual = itemIsActive(item, pathname);
                      const i = indice++;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setAbierto(false)}
                            aria-current={actual ? "page" : undefined}
                            className="tj-mas-item flex flex-col items-center gap-1.5 text-center"
                            style={{ "--i": i } as React.CSSProperties}
                          >
                            <span className="tj-mas-icono">
                              <Icon className="size-5" aria-hidden="true" />
                            </span>
                            <span className="line-clamp-2 text-[11px] leading-tight text-[color:var(--text-secondary)]">
                              {item.label}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
              <Link
                href={`/${barbershopSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tj-mas-item mt-4 mb-2 flex min-h-11 items-center justify-center gap-2 rounded-full tj-boton-vidrio text-sm font-semibold"
                style={{ "--i": indice } as React.CSSProperties}
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                Ver mi página pública
              </Link>
            </div>

            <div ref={fila} className="tj-nav-fila">
              <span
                aria-hidden="true"
                className="tj-nav-pastilla"
                style={
                  pastilla
                    ? { width: pastilla.ancho, transform: `translateX(${pastilla.x}px)` }
                    : { opacity: 0 }
                }
              />
              {barra.slice(0, 2).map((item) => (
                <ItemDeBarra key={item.href} item={item} pathname={pathname} label={etiqueta(item.label, item.href)} />
              ))}
              <span aria-hidden="true" />
              {barra.slice(2).map((item) => (
                <ItemDeBarra key={item.href} item={item} pathname={pathname} label={etiqueta(item.label, item.href)} />
              ))}
              <button
                type="button"
                data-nav="mas"
                className="tj-nav-item"
                aria-expanded={abierto}
                aria-controls={idMas}
                aria-current={!abierto && masElegido ? "page" : undefined}
                onClick={() => setAbierto((v) => !v)}
              >
                <MoreHorizontal className="size-[21px]" aria-hidden="true" />
                Más
              </button>
            </div>
          </nav>
          <button
            type="button"
            onClick={turnoNuevo}
            disabled={plan.isReadOnly}
            aria-label="Turno nuevo"
            className={`tj-nav-mas tj-boton-oro disabled:opacity-40 ${abierto ? "tj-nav-mas--oculto" : ""}`}
          >
            <Plus className="size-[26px]" strokeWidth={2.6} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemDeBarra({
  item,
  pathname,
  label,
}: {
  item: ReturnType<typeof itemsDeLaBarra>[number];
  pathname: string;
  label: string;
}) {
  const Icon = item.icon;
  const actual = itemIsActive(item, pathname);
  return (
    <Link href={item.href} data-nav={item.href} aria-current={actual ? "page" : undefined} className="tj-nav-item">
      <Icon className="size-[21px]" aria-hidden="true" />
      {label}
    </Link>
  );
}
