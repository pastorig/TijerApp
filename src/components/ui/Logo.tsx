import Image from "next/image";
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

// Tamaño nominal en pixels para el atributo width/height de next/image.
// El CSS de markSizeClass controla el size visible; estos números solo
// definen el aspect ratio + dan hints al optimizer para servir el tamaño
// correcto. 64 = 2x del size lg (40px) lo cual cubre retina display.
const markPxSize: Record<LogoSize, number> = {
  sm: 48,
  md: 64,
  lg: 80,
  xl: 112,
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
 * Isotipo TijerApp — PNG master con fondo transparente.
 *
 * Renderiza public/brand/isotipo-mark.png (256×256 transparent PNG derivado
 * del isotipo-master.png entregado por el founder). Esto garantiza fidelidad
 * 100% con la identidad visual de marca en todos los sizes y backgrounds.
 *
 * Por qué PNG en lugar de SVG inline: la geometría del isotipo de marca
 * tiene sutilezas (anti-aliasing, curvas en esquinas, kerning entre alas
 * y stem) que son difíciles de reproducir píxel-perfect en paths SVG.
 * El PNG se usa también en los iconos PWA, así que esta decisión mantiene
 * coherencia visual exacta entre navbar / favicon / app icon.
 */
function IsotypeMark({
  size = "md",
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  const px = markPxSize[size];
  return (
    <Image
      src="/brand/isotipo-mark.png"
      alt=""
      width={px}
      height={px}
      priority
      className={className}
      aria-hidden="true"
    />
  );
}

export function Logo({
  variant = "lockup",
  size = "md",
  className,
}: LogoProps) {
  const mark = (
    <IsotypeMark
      size={size}
      className={cn(markSizeClass[size], "shrink-0")}
    />
  );

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
