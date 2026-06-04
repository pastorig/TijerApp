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
 * Geometría exacta del SVG generado off-Claude (ChatGPT) — coordinates
 * fielmente preservadas para mantener el diseño aprobado por el founder.
 *
 * Polish: stroke="currentGold" + stroke-linejoin=round suaviza las
 * esquinas convexas externas (especialmente las superiores de las alas)
 * sin alterar la geometría de los paths. Inner corners (concavos) no
 * se ven afectados, manteniendo la limpieza de la tipografía.
 */
function IsotypeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      {/* Ala izquierda */}
      <path
        d="M10 18 L26 18 L27.5 18.2 L28.8 18.8 L29.9 20 L31.2 23.5 L19 23.5 L17.2 23.3 L15.8 22.6 L14.7 21.4 L10 18 Z"
        fill="var(--brand-gold)"
        stroke="var(--brand-gold)"
        strokeWidth="2"
      />
      {/* Ala derecha — mirror */}
      <path
        d="M38 18 L54 18 L49.3 21.4 L48.2 22.6 L46.8 23.3 L45 23.5 L32.8 23.5 L34.1 20 L35.2 18.8 L36.5 18.2 L38 18 Z"
        fill="var(--brand-gold)"
        stroke="var(--brand-gold)"
        strokeWidth="2"
      />
      {/* Stem tapered */}
      <path
        d="M28.7 27.4 L35.3 27.4 L34.1 47 L29.9 47 L28.7 27.4 Z"
        fill="var(--brand-gold)"
        stroke="var(--brand-gold)"
        strokeWidth="2"
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
