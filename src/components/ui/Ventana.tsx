"use client";

/**
 * Ventana — la forma de abrir una ventana en el panel (feature 041, tanda 2).
 * Mecánica portada de Dentidad (`ventana.tsx`).
 *
 * - En el celular (< 768 px): hoja de vidrio que sube desde abajo (hasta 92 % de
 *   la pantalla), con manija, que se cierra bajándola con el dedo, tocando
 *   afuera o con Escape. Sale animada y RECIÉN DESPUÉS llama a `onClose`.
 * - En la compu: el mismo panel de siempre (`panelClassName`), al centro, sin
 *   animaciones nuevas: la compu no cambia (FR-010).
 * - Se monta dentro del panel (`.tj-panel`) con `tj-ios-capa`: en el iPhone
 *   instalado lo `fixed` no llega al borde de abajo.
 *
 * Reemplaza al par "fondo fijo + panel" que tenía cada ventana: el contenido y
 * sus botones no cambian.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/** Lo que tarda en irse en el celular. */
export const VENTANA_CIERRE_MS = 340;

const CerrarContext = createContext<(() => void) | null>(null);

/** Cierra la ventana que contiene al componente, con su animación. */
export function useCerrarVentana(): () => void {
  const cerrar = useContext(CerrarContext);
  return cerrar ?? (() => {});
}

type VentanaProps = {
  onClose: () => void;
  /** Lo que lee el lector de pantalla. */
  label: string;
  children: ReactNode;
  /** Las clases del panel de siempre (ancho, fondo, borde, radio en la compu). */
  panelClassName?: string;
  /** Capa (z-index). */
  capa?: string;
  /** Si devuelve false, la ventana no se cierra (mientras guarda). */
  puedeCerrar?: () => boolean;
  /** El id del título, si lo hay (en lugar de `label`). */
  labelledBy?: string;
  /** Escape lo maneja la ventana de adentro (para no cerrar dos veces). */
  sinEscape?: boolean;
};

const esCelular = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 767.98px)").matches;

/** Las ventanas abiertas, la de arriba al final: Escape cierra solo esa. */
const pila: string[] = [];

export function Ventana({
  onClose,
  label,
  children,
  panelClassName = "",
  capa = "z-[60]",
  puedeCerrar,
  labelledBy,
  sinEscape = false,
}: VentanaProps) {
  // Monta cerrada y en el cuadro siguiente se abre, así la entrada se anima.
  const [abierta, setAbierta] = useState(false);
  const [bajada, setBajada] = useState<number | null>(null);
  const hoja = useRef<HTMLDivElement | null>(null);
  const cerrando = useRef(false);
  const alCerrar = useRef(onClose);
  const permiso = useRef(puedeCerrar);
  useEffect(() => {
    alCerrar.current = onClose;
    permiso.current = puedeCerrar;
  }, [onClose, puedeCerrar]);

  const espera = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (espera.current !== null) window.clearTimeout(espera.current);
    },
    [],
  );

  const cerrar = useCallback(() => {
    if (cerrando.current) return;
    if (permiso.current && !permiso.current()) {
      setBajada(null);
      return;
    }
    // En la compu, como siempre: se cierra en el acto.
    if (!esCelular()) {
      alCerrar.current();
      return;
    }
    cerrando.current = true;
    setBajada(null);
    setAbierta(false);
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    espera.current = window.setTimeout(() => {
      espera.current = null;
      alCerrar.current();
    }, reducido ? 160 : VENTANA_CIERRE_MS);
  }, []);

  const id = useId();
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const cuadro = window.requestAnimationFrame(() => setAbierta(true));
    pila.push(id);
    function onKey(event: KeyboardEvent) {
      if (sinEscape || event.key !== "Escape" || pila[pila.length - 1] !== id) return;
      event.stopPropagation();
      cerrar();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(cuadro);
      document.removeEventListener("keydown", onKey);
      const i = pila.lastIndexOf(id);
      if (i >= 0) pila.splice(i, 1);
      if (anterior && document.contains(anterior)) anterior.focus?.({ preventScroll: true });
    };
  }, [cerrar, id, sinEscape]);

  // ── El gesto: solo en el celular, desde la manija ──
  const gesto = useRef<{ id: number; y0: number; t0: number; moviendo: boolean } | null>(null);
  const tragarClic = useRef(false);

  function apoyar(event: React.PointerEvent<HTMLDivElement>) {
    if (!esCelular()) return;
    const objetivo = event.target as HTMLElement;
    if (!objetivo.closest("[data-manija]")) return;
    gesto.current = { id: event.pointerId, y0: event.clientY, t0: event.timeStamp, moviendo: false };
  }
  function mover(event: React.PointerEvent<HTMLDivElement>) {
    const g = gesto.current;
    if (!g || g.id !== event.pointerId) return;
    const dy = event.clientY - g.y0;
    if (!g.moviendo) {
      if (Math.abs(dy) < 6) return; // menos de 6 px es un toque
      g.moviendo = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Sin captura, el gesto sigue mientras el dedo esté encima.
      }
    }
    setBajada(dy);
  }
  function soltar(event: React.PointerEvent<HTMLDivElement>) {
    const g = gesto.current;
    gesto.current = null;
    if (!g || g.id !== event.pointerId || !g.moviendo) return;
    const dy = event.clientY - g.y0;
    const velocidad = dy / Math.max(1, event.timeStamp - g.t0); // px por ms
    tragarClic.current = true;
    window.setTimeout(() => {
      tragarClic.current = false;
    }, 350);
    if (dy > 110 || (dy > 12 && velocidad > 0.5)) cerrar();
    else setBajada(null);
  }

  const corrimiento = bajada === null ? null : bajada >= 0 ? bajada : Math.max(-16, bajada * 0.2);
  const desvanecido = bajada !== null && bajada > 0 ? Math.max(0, 1 - bajada / 420) : undefined;

  if (typeof document === "undefined") return null;
  const destino = (document.querySelector(".tj-panel") as HTMLElement | null) ?? document.body;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      className={`tj-ventana-capa tj-ios-capa fixed inset-0 flex items-end justify-center sm:items-center sm:p-4 ${capa} ${
        abierta ? "tj-ventana-capa--abierta" : ""
      }`}
    >
      <div
        aria-hidden="true"
        className={`tj-ventana-velo absolute inset-0 bg-black/70 backdrop-blur-sm ${
          bajada !== null ? "tj-ventana-velo--arrastre" : ""
        }`}
        style={desvanecido !== undefined ? { opacity: desvanecido } : undefined}
        onClick={cerrar}
      />
      <CerrarContext.Provider value={cerrar}>
        <div
          ref={hoja}
          className={`tj-ventana relative ${panelClassName} ${abierta ? "tj-ventana--abierta" : ""} ${
            corrimiento !== null ? "tj-ventana--arrastre" : ""
          }`}
          style={corrimiento !== null ? { transform: `translateY(${corrimiento}px)` } : undefined}
          onPointerDown={apoyar}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={() => {
            gesto.current = null;
            setBajada(null);
          }}
          onClickCapture={(event) => {
            if (tragarClic.current) {
              tragarClic.current = false;
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <div data-manija="" aria-hidden="true" className="tj-ventana-manija md:hidden">
            <span />
          </div>
          {children}
        </div>
      </CerrarContext.Provider>
    </div>,
    destino,
  );
}
