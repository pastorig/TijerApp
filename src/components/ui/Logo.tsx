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
 * Geometría medida directamente del PNG master (public/brand/isotipo-master.png).
 * viewBox 0 0 100 100 con coordenadas reales del isotipo de marca:
 *   - Ala izquierda: trapecio con outer-edge inclinado (22,28 → 28,38)
 *   - Ala derecha: mirror exacto (78,28 → 72,38)
 *   - Stem: trapecio tapered top 12 → bottom 8 (sutil afinamiento)
 *   - Gap central entre alas: 4 unidades (48 a 52)
 *   - Gap vertical entre alas y stem: 3 unidades (38 a 41)
 *
 * Stroke gold sutil con linejoin=round redondea esquinas convex sin
 * alterar la geometría — replica el look del PNG (anti-aliasing natural).
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
      {/* Ala izquierda — trapecio con outer-edge inclinado hacia adentro */}
      <path
        d="M 22 28 L 48 28 L 48 38 L 28 38 Z"
        fill="var(--brand-gold)"
        stroke="var(--brand-gold)"
        strokeWidth="0.8"
      />
      {/* Ala derecha — mirror exacto del ala izquierda */}
      <path
        d="M 52 28 L 78 28 L 72 38 L 52 38 Z"
        fill="var(--brand-gold)"
        stroke="var(--brand-gold)"
        strokeWidth="0.8"
      />
      {/* Stem — trapecio que se afina hacia abajo (12u top → 8u bottom) */}
      <path
        d="M 44 41 L 56 41 L 54 82 L 46 82 Z"
        fill="var(--brand-gold)"
        stroke="var(--brand-gold)"
        strokeWidth="0.8"
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
