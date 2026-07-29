"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing } from "lucide-react";
import { cn } from "@/lib/cn";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

/** Horarios plausibles, fijos y en orden: nada de `Math.random()` en el primer
 *  render (rompería la hidratación) y evita que se lea como imagen congelada. */
const SLOTS = ["16:30", "17:15", "18:00", "19:30", "11:45"] as const;

const VISIBLE_MS = 3400;
const EXIT_MS = 520;
const PAUSE_MS = 1700;

/**
 * HeroNotification — "Nuevo turno · HH:MM" entrando de forma cíclica sobre el
 * cluster del hero.
 *
 * Posición absoluta: entrar y salir no mueve nada del layout. El ciclo son
 * `setTimeout` encadenados (no `setInterval`) y solo corre si el hero está en
 * pantalla y la pestaña está activa — así no se acumulan disparos ni sale una
 * ráfaga al volver a la pestaña.
 *
 * Con movimiento reducido queda visible y quieta: la información es la misma
 * que ve cualquier visitante, sin movimiento.
 */
export function HeroNotification({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  const [index, setIndex] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;
    const el = ref.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let inView = false;
    let running = false;

    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
    };

    const cycle = () => {
      setShown(true);
      timer = setTimeout(() => {
        setShown(false);
        timer = setTimeout(() => {
          setIndex((current) => (current + 1) % SLOTS.length);
          timer = setTimeout(cycle, PAUSE_MS);
        }, EXIT_MS);
      }, VISIBLE_MS);
    };

    const sync = () => {
      const shouldRun = inView && document.visibilityState === "visible";
      if (shouldRun === running) return;
      running = shouldRun;
      clear();
      if (shouldRun) timer = setTimeout(cycle, 900);
      else setShown(false);
    };

    document.addEventListener("visibilitychange", sync);

    if (typeof IntersectionObserver === "undefined") {
      inView = true;
      sync();
      return () => {
        document.removeEventListener("visibilitychange", sync);
        clear();
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) inView = entry.isIntersecting;
        sync();
      },
      { threshold: 0.2 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      clear();
    };
  }, [prefersReducedMotion]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "hero-notif card-premium pointer-events-none absolute z-20 flex items-center gap-2 px-3 py-2",
        (shown || prefersReducedMotion) && "is-in",
        className,
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]">
        <BellRing className="size-3" />
      </span>
      <span className="leading-tight">
        <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-white">
          Nuevo turno
        </span>
        <span className="block text-[9px] text-[color:var(--text-muted)]">
          Hoy {SLOTS[index]} · Corte + barba
        </span>
      </span>
    </div>
  );
}
