"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

/**
 * Las piezas de movimiento de la reserva del cliente (etapa 1 de animaciones).
 *
 * ── Por qué acá se puede "mucho" ────────────────────────────────────────────
 * Un cliente reserva de vez en cuando, y cada reserva es el momento que le
 * vende la barbería. Es la superficie donde el movimiento que se nota suma. El
 * panel del barbero es lo contrario —se abre veinte veces por día— y por eso
 * NADA de esto se reusa ahí.
 *
 * ── Reglas ──────────────────────────────────────────────────────────────────
 * - Solo `transform` y `opacity`: no mueven el layout ni repintan.
 * - Con "reducir movimiento" todo aparece en su estado final. Lo decide
 *   `useReducedMotion` en cada pieza (y el `MotionConfig` de la reserva para
 *   el resto), no un `if` suelto por componente.
 * - Curva única: la `--ease-out-soft` del proyecto.
 */

/** La curva del proyecto (`--ease-out-soft`), para Framer Motion. */
export const EASE_SUAVE = [0.2, 0.8, 0.2, 1] as const;

/**
 * Un precio que cuenta hasta su valor cuando cambia.
 *
 * Al elegir otro servicio o aplicar un cupón el total cambiaba de golpe y era
 * fácil no darse cuenta de que había cambiado. La primera vez aparece directo:
 * contar desde cero un precio que nadie vio antes es ruido, no información.
 */
export function PrecioAnimado({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const reducido = useReducedMotion();
  const [mostrado, setMostrado] = useState(value);
  const anterior = useRef(value);

  useEffect(() => {
    const desde = anterior.current;
    anterior.current = value;
    if (desde === value) return;
    if (reducido) {
      const id = requestAnimationFrame(() => setMostrado(value));
      return () => cancelAnimationFrame(id);
    }
    const control = animate(desde, value, {
      duration: 0.4,
      ease: EASE_SUAVE,
      onUpdate: (v) => setMostrado(Math.round(v)),
    });
    return () => control.stop();
  }, [value, reducido]);

  return (
    <span className={className} aria-label={formatPrice(value)}>
      <span aria-hidden="true">{formatPrice(mostrado)}</span>
    </span>
  );
}

/** El tilde de "turno reservado": el círculo entra y el trazo se dibuja. */
export function TildeDeExito() {
  const reducido = useReducedMotion();
  return (
    <motion.div
      initial={reducido ? false : { scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", duration: 0.55, bounce: 0.35 }}
      className="relative flex size-16 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/50 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-8"
        aria-hidden="true"
      >
        <motion.path
          d="M20 6L9 17l-5-5"
          initial={reducido ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: EASE_SUAVE }}
        />
      </svg>
    </motion.div>
  );
}

// Los destellos se reparten en círculo con una variación fija: tiene que verse
// igual en el servidor y en el navegador, así que nada de Math.random.
const DESTELLOS = Array.from({ length: 16 }, (_, i) => {
  const angulo = (i / 16) * Math.PI * 2 + (i % 2 ? 0.18 : -0.12);
  const distancia = 70 + ((i * 37) % 55);
  return {
    x: Math.cos(angulo) * distancia,
    y: Math.sin(angulo) * distancia,
    tamano: 4 + ((i * 13) % 5),
    demora: 0.18 + ((i * 7) % 10) / 100,
    claro: i % 3 === 0,
  };
});

/**
 * Una ráfaga de destellos dorados alrededor del tilde. Una sola vez.
 *
 * Es el único adorno puro de toda la reserva, y está acá porque es el único
 * momento que es un festejo. Es decorativo: no recibe toques, no lo leen los
 * lectores de pantalla y con "reducir movimiento" directamente no se dibuja.
 */
export function Destellos() {
  const reducido = useReducedMotion();
  if (reducido) return null;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 size-0"
    >
      {DESTELLOS.map((d, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: d.tamano,
            height: d.tamano,
            marginLeft: -d.tamano / 2,
            marginTop: -d.tamano / 2,
            background: d.claro ? "var(--brand-gold-hi)" : "var(--brand-gold)",
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
          animate={{
            x: d.x,
            y: d.y,
            opacity: [0, 1, 1, 0],
            scale: [0.4, 1, 1, 0.3],
          }}
          transition={{ duration: 0.9, delay: d.demora, ease: EASE_SUAVE }}
        />
      ))}
    </span>
  );
}

/**
 * Un título que entra palabra por palabra.
 *
 * El texto completo va en `aria-label` y las palabras sueltas quedan ocultas
 * para los lectores de pantalla: si no, lo leen cortado.
 */
export function TituloPorPalabras({
  texto,
  className,
  demora = 0,
}: {
  texto: string;
  className?: string;
  demora?: number;
}) {
  const reducido = useReducedMotion();
  const palabras = texto.split(/\s+/).filter(Boolean);
  return (
    <h1 className={className} aria-label={texto}>
      {palabras.map((palabra, i) => (
        <span
          key={`${palabra}-${i}`}
          aria-hidden="true"
          // El recorte hace que la palabra "salga de abajo" en vez de flotar.
          className="inline-block overflow-hidden pb-[0.08em] align-bottom"
        >
          <motion.span
            className="inline-block"
            initial={reducido ? false : { y: "105%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, delay: demora + i * 0.06, ease: EASE_SUAVE }}
          >
            {palabra}
            {i < palabras.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

/** Un bloque que sube y aparece, con demora. Para escalonar el detalle. */
export function Aparecer({
  children,
  demora = 0,
  className,
}: {
  children: React.ReactNode;
  demora?: number;
  className?: string;
}) {
  const reducido = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reducido ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, delay: demora, ease: EASE_SUAVE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Un anillo que late una vez alrededor de lo que envuelve, cuando `activo`
 * pasa a verdadero. Lo usa el botón "Reservar" del celular: es la señal de que
 * el formulario ya está completo y se puede tocar.
 */
export function LatidoUnaVez({
  activo,
  children,
  className,
}: {
  activo: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const reducido = useReducedMotion();
  return (
    <span className={`relative inline-flex ${className ?? ""}`}>
      {activo && !reducido ? (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[var(--radius-sm)] border-2 border-[color:var(--brand-gold)]"
          initial={{ opacity: 0.7, scale: 1 }}
          animate={{ opacity: 0, scale: 1.18 }}
          transition={{ duration: 0.9, ease: EASE_SUAVE }}
        />
      ) : null}
      {children}
    </span>
  );
}

/**
 * Baja suave hasta el paso siguiente, solo si quedó fuera de la vista.
 *
 * Se llama desde lo que el cliente toca (elegir barbero, elegir servicio), no
 * desde un efecto: si no, también saltaría solo cuando la página preselecciona
 * al único barbero al cargar.
 */
export function bajarHastaElPaso(id: string) {
  if (typeof window === "undefined") return;
  // Un respiro para que el paso siguiente termine de dibujarse.
  window.setTimeout(() => {
    const destino = document.getElementById(id);
    if (!destino) return;
    const { top } = destino.getBoundingClientRect();
    // Si ya se ve cómodo (en los dos tercios de arriba), no se mueve nada.
    if (top >= 0 && top < window.innerHeight * 0.62) return;
    const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: window.scrollY + top - 88,
      behavior: sinMovimiento ? "auto" : "smooth",
    });
  }, 140);
}

/**
 * Las tarjetas para elegir (barbero, servicio) comparten forma y gestos.
 *
 * Sin `press-shrink`: esa clase pisa el `transition` de la tarjeta y los
 * gestos ya los maneja Framer Motion (que además ignora el "hover" de un dedo).
 */
export const TARJETA_ELEGIBLE = {
  base: "group relative flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] border text-left transition-colors duration-[var(--duration-fast)] disabled:cursor-not-allowed disabled:opacity-60",
  // El borde y el fondo dorados los dibuja `FondoElegido`, que es el que viaja.
  elegida: "border-transparent",
  libre:
    "border-[color:var(--border-default)] bg-[color:var(--surface-1)] hover:border-[color:var(--brand-gold)]/50",
  // El brillo es una capa aparte que solo cambia de opacidad: animar la sombra
  // de la tarjeta la haría repintar entera.
  brillo:
    "pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 shadow-[0_12px_28px_-14px_rgba(201,162,62,0.75)] transition-opacity duration-[var(--duration-base)] group-hover:opacity-100 group-disabled:hidden",
  gestos(deshabilitada: boolean) {
    if (deshabilitada) return {};
    return {
      whileHover: { y: -2 },
      whileTap: { scale: 0.97 },
      transition: { duration: 0.16, ease: EASE_SUAVE },
    };
  },
};

/**
 * El fondo dorado de la tarjeta elegida. Como todas las tarjetas de un mismo
 * `grupo` comparten `layoutId`, al elegir otra el fondo se desliza hasta ahí
 * en vez de apagarse en una y prenderse en la otra.
 */
export function FondoElegido({ grupo }: { grupo: string }) {
  return (
    <motion.span
      layoutId={`reserva-elegido-${grupo}`}
      aria-hidden="true"
      className="pointer-events-none absolute -inset-px rounded-[inherit] border border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] ring-1 ring-[color:var(--brand-gold)]/25"
      transition={{ type: "spring", duration: 0.4, bounce: 0.18 }}
    />
  );
}

/** El tilde de la tarjeta elegida: entra girando. */
export function TildeElegido({ className }: { className?: string }) {
  return (
    <motion.span
      aria-hidden="true"
      className={cn("block size-4 text-[color:var(--brand-gold)]", className)}
      initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: "spring", duration: 0.4, bounce: 0.35 }}
    >
      <Check className="size-4" />
    </motion.span>
  );
}
