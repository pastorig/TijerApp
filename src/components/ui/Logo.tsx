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
 * Isotipo BarberSync — Grilla 4×4 con una diagonal de 4 celdas alternando
 * gold y silver (los colores del wordmark BARBER/SYNC).
 *
 * Lectura: la grilla es la agenda; la diagonal es la sincronía atravesándola.
 * Cliente y barbero confluyendo en un mismo turno.
 *
 * El render premium / press kit se puede colocar en /public/brand/isotype.png
 * y usarse con next/image donde se quiera mayor presencia visual.
 */
function IsotypeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(6 6)">
        {/* Row 0 */}
        <rect x="0"  y="0"  width="10" height="10" fill="none" stroke="var(--brand-gold)" strokeWidth="1" strokeOpacity="0.35" />
        <rect x="14" y="0"  width="10" height="10" fill="none" stroke="var(--brand-gold)" strokeWidth="1" strokeOpacity="0.35" />
        <rect x="28" y="0"  width="10" height="10" fill="none" stroke="var(--brand-gold)" strokeWidth="1" strokeOpacity="0.35" />
        <rect x="42" y="0"  width="10" height="10" fill="var(--brand-silver)" />
        {/* Row 1 */}
        <rect x="0"  y="14" width="10" height="10" fill="none" stroke="var(--brand-gold)" strokeWidth="1" strokeOpacity="0.35" />
        <rect x="14" y="14" width="10" height="10" fill="none" stroke="var(--brand-gold)" strokeWidth="1" strokeOpacity="0.35" />
        <rect x="28" y="14" width="10" height="10" fill="var(--brand-gold)" />
        <rect x="42" y="14" width="10" height="10" fill="none" stroke="var(--brand-gold)" strokeWidth="1" strokeOpacity="0.35" />
        {/* Row 2 */}
        <rect x="0"  y="28" width="10" height="10" fill="none" stroke="var(--brand-gold)" strokeWidth="1" strokeOpacity="0.35" />
        <rect x="14" y="28" width="10" height="10" fill="var(--brand-silver)" />
        <rect x="28" y="28" width="10" height="10" fill="none" stroke="var(--brand-gold)" strokeWidth="1" strokeOpacity="0.35" />
        <rect x="42" y="28" width="10" height="10" fill="none" stroke="var(--brand-gold)" strokeWidth="1" strokeOpacity="0.35" />
        {/* Row 3 */}
        <rect x="0"  y="42" width="10" height="10" fill="var(--brand-gold)" />
        <rect x="14" y="42" width="10" height="10" fill="none" stroke="var(--brand-gold)" strokeWidth="1" strokeOpacity="0.35" />
        <rect x="28" y="42" width="10" height="10" fill="none" stroke="var(--brand-gold)" strokeWidth="1" strokeOpacity="0.35" />
        <rect x="42" y="42" width="10" height="10" fill="none" stroke="var(--brand-gold)" strokeWidth="1" strokeOpacity="0.35" />
      </g>
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
      <span className={cn("inline-flex", className)} aria-label="BarberSync">
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
      <span className="text-[color:var(--brand-gold)]">Barber</span>
      <span className="text-[color:var(--brand-silver)]">Sync</span>
    </span>
  );

  if (variant === "wordmark") {
    return (
      <span
        className={cn("inline-flex items-center", className)}
        aria-label="BarberSync"
      >
        {wordmark}
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center", gapClass[size], className)}
      aria-label="BarberSync"
    >
      {mark}
      {wordmark}
    </span>
  );
}
