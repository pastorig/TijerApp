import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Componentes premium reutilizables para KPIs (la "receta" del level-up visual).
 * Todo dentro del sistema negro/dorado. Pensados para el dashboard del admin
 * y para replicar en el resto de la app (reportes, owner, etc.).
 *
 *  - MetricCard: tarjeta con profundidad (borde, brillo interno, sombra en capas)
 *    + header con ícono, y hover con elevación.
 *  - RadialGauge: medidor radial (anillo SVG) para porcentajes (ocupación, etc.).
 *  - DistributionBar: barra segmentada + leyenda para desgloses (estados, etc.).
 */

export function MetricCard({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--brand-gold)]/12 bg-[color:var(--surface-1)] p-4 transition-all duration-[var(--duration-base)] ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:border-[color:var(--brand-gold)]/35 sm:p-5",
        className,
      )}
      style={{
        backgroundImage:
          "radial-gradient(120% 130% at 0% 0%, rgba(201,162,62,0.16), rgba(201,162,62,0.04) 26%, transparent 52%), linear-gradient(155deg, rgba(226,194,102,0.06), transparent 46%), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 40%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 48px -26px rgba(0,0,0,0.92)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
          {label}
        </p>
        {Icon ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)] transition-transform duration-[var(--duration-fast)] group-hover:scale-105">
            <Icon className="size-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function RadialGauge({
  value,
  max = 100,
  size = 88,
  stroke = 9,
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(pct)}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="rg-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8a6e25" />
            <stop offset="50%" stopColor="#c9a23e" />
            <stop offset="100%" stopColor="#e2c266" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          style={{ stroke: "var(--surface-2)" }}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#rg-gold)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 700ms var(--ease-out-soft)",
          }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="stat-number text-xl font-black tabular-nums text-white">
          {Math.round(pct)}%
        </span>
      </span>
    </span>
  );
}

export type DistributionSegment = {
  label: string;
  value: number;
  /** Clase de fondo del segmento + del dot de la leyenda. */
  barClass: string;
};

export function DistributionBar({
  segments,
  total,
}: {
  segments: DistributionSegment[];
  total?: number;
}) {
  const sum =
    total ?? segments.reduce((acc, segment) => acc + segment.value, 0);

  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]">
        {sum > 0
          ? segments.map((segment) =>
              segment.value > 0 ? (
                <div
                  key={segment.label}
                  className={cn(
                    "h-full transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out-soft)]",
                    segment.barClass,
                  )}
                  style={{ width: `${(segment.value / sum) * 100}%` }}
                />
              ) : null,
            )
          : null}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1.5">
        {segments.map((segment) => (
          <li
            key={segment.label}
            className="inline-flex items-center gap-1.5 text-[11px] text-[color:var(--text-muted)]"
          >
            <span
              aria-hidden="true"
              className={cn("inline-block size-1.5 rounded-full", segment.barClass)}
            />
            {segment.label}
            <b className="stat-number font-bold tabular-nums text-white">
              {segment.value}
            </b>
          </li>
        ))}
      </ul>
    </div>
  );
}
