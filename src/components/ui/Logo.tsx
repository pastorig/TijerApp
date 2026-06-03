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
 * Isotipo TijerApp — letra T estilizada con dos "alas" arriba de un
 * stem tapered. Las alas se separan ligeramente del stem y caen hacia
 * los extremos (gesto de hojas abiertas). Sólido en gold.
 *
 * Lectura: T de Tijer + alas como hojas de tijera abriéndose. Lee
 * como letra a primera vista, como tijera al segundo análisis.
 *
 * Diseño off-Claude (chatgpt prompt). Implementado fielmente al SVG
 * que se cargó en el chat.
 */
function IsotypeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Ala izquierda — paralelogramo tilteado hacia afuera-abajo */}
      <path
        d="M 11 21 L 27 21 L 27 26 L 9 28 Z"
        fill="var(--brand-gold)"
      />
      {/* Ala derecha — mirror */}
      <path
        d="M 37 21 L 53 21 L 55 28 L 37 26 Z"
        fill="var(--brand-gold)"
      />
      {/* Stem — slight taper, 1.5px gap a cada lado de las alas */}
      <path
        d="M 28.5 21 L 35.5 21 L 34 49 L 30 49 Z"
        fill="var(--brand-gold)"
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
