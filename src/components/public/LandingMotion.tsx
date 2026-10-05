"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type Variants,
} from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * El movimiento de la página pública de la barbería (etapa 2 de animaciones).
 *
 * ── La regla que ordena todo ────────────────────────────────────────────────
 * Nada sale del servidor escondido. Lo que entra "al hacer scroll" se esconde
 * recién cuando el navegador confirma que está por debajo de la pantalla, y
 * lo que ya se ve al cargar no se toca. Así, sin JavaScript (o mientras
 * todavía no cargó) la página se lee entera, y el contenido de arriba no
 * espera a nadie para pintarse.
 *
 * Solo `transform` y `opacity`. Con "reducir movimiento" no hay
 * desplazamientos: queda, como mucho, un fundido.
 */

/** La curva del proyecto (`--ease-out-soft`). */
const EASE_SUAVE = [0.2, 0.8, 0.2, 1] as const;

type Estado = "quieto" | "oculto" | "visible";

/**
 * Dice si el elemento todavía no entró en pantalla ("oculto"), si acaba de
 * entrar ("visible") o si ya estaba a la vista al cargar ("quieto": no hay
 * nada que animar).
 */
function useEntraEnVista<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [estado, setEstado] = useState<Estado>("quieto");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let primera = true;
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            if (!primera) setEstado("visible");
            observador.disconnect();
          } else if (primera) {
            setEstado("oculto");
          }
          primera = false;
        }
      },
      // Sin umbral: una grilla más alta que la pantalla nunca llegaría a un
      // porcentaje visible. El margen hace que entre un poco antes del borde.
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return { ref, estado };
}

const ETIQUETAS = {
  ul: motion.ul,
  div: motion.div,
  header: motion.header,
  li: motion.li,
  article: motion.article,
  p: motion.p,
  h2: motion.h2,
} as const;

type EtiquetaDeEscalera = "ul" | "div" | "header";
type EtiquetaDePeldano = "li" | "article" | "div" | "p" | "h2";

/**
 * Un grupo cuyos `Peldano` entran uno atrás del otro cuando el grupo aparece
 * en pantalla. Una sola vez.
 */
export function Escalera({
  as = "ul",
  paso = 0.07,
  className,
  children,
}: {
  as?: EtiquetaDeEscalera;
  /** Segundos entre un peldaño y el siguiente. */
  paso?: number;
  className?: string;
  children: ReactNode;
}) {
  const { ref, estado } = useEntraEnVista<HTMLElement>();
  const Etiqueta = ETIQUETAS[as] as typeof motion.div;
  const variantes: Variants = {
    oculto: { transition: { duration: 0 } },
    visible: { transition: { staggerChildren: paso } },
  };

  return (
    <MotionConfig reducedMotion="user">
      <Etiqueta
        ref={ref as React.Ref<HTMLDivElement>}
        className={className}
        variants={variantes}
        // `false`: lo que llega del servidor queda como está, visible.
        initial={false}
        animate={estado === "oculto" ? "oculto" : "visible"}
      >
        {children}
      </Etiqueta>
    </MotionConfig>
  );
}

const VARIANTES_DE_PELDANO: Variants = {
  oculto: { opacity: 0, y: 22, transition: { duration: 0 } },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_SUAVE },
  },
};

/** Un hijo de `Escalera`. Con `levanta`, además sube un poco al pasarle el mouse. */
export function Peldano({
  as = "li",
  levanta = false,
  className,
  children,
}: {
  as?: EtiquetaDePeldano;
  levanta?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const Etiqueta = ETIQUETAS[as] as typeof motion.div;
  return (
    <Etiqueta
      className={className}
      variants={VARIANTES_DE_PELDANO}
      // Framer Motion ignora el "hover" de un dedo: en el celular no queda
      // ninguna tarjeta levantada después de tocarla.
      whileHover={
        levanta
          ? { y: -4, transition: { duration: 0.2, ease: EASE_SUAVE } }
          : undefined
      }
    >
      {children}
    </Etiqueta>
  );
}

/**
 * Lo que se prende al pasar el mouse por una tarjeta: un brillo dorado por
 * fuera y un reflejo que la cruza. La tarjeta tiene que ser `group relative`.
 *
 * Son capas aparte que solo cambian `opacity` y `transform`: animar la sombra
 * o el fondo de la tarjeta la haría repintar entera en cada cuadro.
 */
export function Brillo({ reflejo = true }: { reflejo?: boolean }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 shadow-[0_18px_40px_-18px_rgba(201,162,62,0.6)] transition-opacity duration-[var(--duration-base)] group-hover:opacity-100"
      />
      {reflejo ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          <span className="absolute inset-y-0 -left-1/3 w-1/3 -translate-x-full -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[500%]" />
        </span>
      ) : null}
    </>
  );
}

/** Las cinco estrellas del promedio: se prenden de a una al entrar en pantalla. */
export function EstrellasEnCascada({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  const { ref, estado } = useEntraEnVista<HTMLDivElement>();
  const llenas = Math.round(rating);
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        ref={ref}
        className={cn("flex items-center gap-0.5", className)}
        initial={false}
        animate={estado === "oculto" ? "oculto" : "visible"}
        variants={{
          oculto: { transition: { duration: 0 } },
          visible: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
        }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.span
            key={n}
            variants={{
              oculto: { opacity: 0, scale: 0.5, rotate: -30, transition: { duration: 0 } },
              visible: {
                opacity: 1,
                scale: 1,
                rotate: 0,
                transition: { type: "spring", duration: 0.5, bounce: 0.45 },
              },
            }}
          >
            <Star
              className={cn(
                "size-5",
                n <= llenas
                  ? "fill-[color:var(--brand-gold)] text-[color:var(--brand-gold)]"
                  : "text-[color:var(--text-subtle)]",
              )}
            />
          </motion.span>
        ))}
      </motion.div>
    </MotionConfig>
  );
}

/**
 * Un número que cuenta hasta su valor al entrar en pantalla. Del servidor
 * sale ya con el valor final: si no llega a animarse, igual dice la verdad.
 */
export function NumeroQueCuenta({
  value,
  decimales = 0,
  className,
}: {
  value: number;
  decimales?: number;
  className?: string;
}) {
  const reducido = useReducedMotion();
  const { ref, estado } = useEntraEnVista<HTMLSpanElement>();
  const [mostrado, setMostrado] = useState(value);

  useEffect(() => {
    if (estado !== "visible" || reducido) return;
    const control = animate(0, value, {
      duration: 0.9,
      ease: EASE_SUAVE,
      onUpdate: (v) => setMostrado(v),
    });
    return () => control.stop();
  }, [estado, value, reducido]);

  return (
    <span ref={ref} className={className} aria-label={value.toFixed(decimales)}>
      <span aria-hidden="true">{mostrado.toFixed(decimales)}</span>
    </span>
  );
}

/**
 * Una luz dorada que sigue al mouse dentro de la sección que la contiene
 * (que tiene que ser `relative`). Solo con mouse: en un celular no hay puntero
 * que seguir, y con "reducir movimiento" no se prende.
 */
export function LuzQueSigue() {
  const ref = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xSuave = useSpring(x, { stiffness: 110, damping: 22 });
  const ySuave = useSpring(y, { stiffness: 110, damping: 22 });
  const [prendida, setPrendida] = useState(false);

  useEffect(() => {
    const padre = ref.current?.parentElement;
    if (!padre) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function mover(evento: PointerEvent) {
      const caja = padre!.getBoundingClientRect();
      x.set(evento.clientX - caja.left);
      y.set(evento.clientY - caja.top);
      setPrendida(true);
    }
    function salir() {
      setPrendida(false);
    }
    padre.addEventListener("pointermove", mover);
    padre.addEventListener("pointerleave", salir);
    return () => {
      padre.removeEventListener("pointermove", mover);
      padre.removeEventListener("pointerleave", salir);
    };
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 -z-10 -ml-[240px] -mt-[240px] size-[480px] rounded-full"
      style={{
        x: xSuave,
        y: ySuave,
        background:
          "radial-gradient(closest-side, color-mix(in oklab, var(--brand-gold) 16%, transparent), transparent)",
      }}
      initial={false}
      animate={{ opacity: prendida ? 1 : 0 }}
      transition={{ duration: 0.4 }}
    />
  );
}

/**
 * Un número que, cuando cambia, cuenta desde el valor anterior hasta el nuevo.
 * Para resultados que el visitante mueve con sus propias manos (una
 * calculadora): el número acompaña al control en vez de saltar.
 */
export function NumeroVivo({
  value,
  formato,
  className,
}: {
  value: number;
  formato: (valor: number) => string;
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
      duration: 0.35,
      ease: EASE_SUAVE,
      onUpdate: (v) => setMostrado(v),
    });
    return () => control.stop();
  }, [value, reducido]);

  return (
    <span className={className} aria-label={formato(value)}>
      <span aria-hidden="true">{formato(mostrado)}</span>
    </span>
  );
}
