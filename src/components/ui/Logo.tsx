import { cn } from "@/lib/cn";

type LogoVariant = "lockup" | "wordmark" | "mark";
type LogoSize = "sm" | "md" | "lg" | "xl";

type LogoProps = {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
};

const markSizeClass: Record<LogoSize, string> = {
  sm: "size-6",
  md: "size-8",
  lg: "size-10",
  xl: "size-14",
};

const wordmarkSizeClass: Record<LogoSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-2xl",
};

const gapClass: Record<LogoSize, string> = {
  sm: "gap-2",
  md: "gap-2.5",
  lg: "gap-3",
  xl: "gap-4",
};

/**
 * Isotipo TijerApp — T estilizada con alas + stem tapered. Sólido gold.
 *
 * Geometría limpia basada en el isotipo de referencia (PNG 1240x1240):
 *   - Alas: trapecios con borde superior horizontal, borde interior
 *     vertical (cerca del centro), borde inferior horizontal corto y
 *     borde exterior INCLINADO (las esquinas inferiores van hacia adentro).
 *   - Stem: trapecio que se afina hacia abajo (top más ancho que bottom).
 *   - Gap central entre alas: ~4 unidades.
 *
 * Sin puntos intermedios — paths puros con 4 vértices cada uno. Esquinas
 * suavizadas con stroke-linejoin=round + stroke del mismo color (gold),
 * lo cual redondea sutilmente los convex corners sin alterar la geometría.
 */
function IsotypeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      {/* Ala izquierda — trapecio con borde exterior inclinado */}
      <path
        d="M 26 30.5 L 48 30.5 L 48 38 L 28.5 38 Z"
        fill="var(--brand-gold)"
        stroke="var(--brand-gold)"
        strokeWidth="1.2"
      />
      {/* Ala derecha — mirror exacto del ala izquierda */}
      <path
        d="M 52 30.5 L 74 30.5 L 71.5 38 L 52 38 Z"
        fill="var(--brand-gold)"
        stroke="var(--brand-gold)"
        strokeWidth="1.2"
      />
      {/* Stem — trapecio que se afina hacia abajo (taper) */}
      <path
        d="M 44 42 L 56 42 L 54 82 L 46 82 Z"
        fill="var(--brand-gold)"
        stroke="var(--brand-gold)"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function Logo({
  variant = "lockup",
  size = "md",
  className,
}: LogoProps) {
  const mark = <IsotypeMark className={cn(markSizeClass[size], "shrink-0")} />;

  if (variant === "mark") {
    return (
      <span className={cn("inline-flex", className)} aria-label="TijerApp">
        {mark}
      </span>
    );
  }

  const wordmark = (
    <span
      className={cn(
        "font-black uppercase leading-none tracking-[0.08em]",
        wordmarkSizeClass[size],
      )}
    >
      <span className="text-[color:var(--brand-gold)]">Tijer</span>
      <span className="text-[color:var(--brand-silver)]">App</span>
    </span>
  );

  if (variant === "wordmark") {
    return (
      <span
        className={cn("inline-flex items-center", className)}
        aria-label="TijerApp"
      >
        {wordmark}
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center", gapClass[size], className)}
      aria-label="TijerApp"
    >
      {mark}
      {wordmark}
    </span>
  );
}
