import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "neutral" | "accent" | "success" | "danger" | "muted" | "info";
type BadgeSize = "sm" | "md";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
};

const variantClass: Record<BadgeVariant, string> = {
  neutral:
    "border-[color:var(--border-default)] text-[color:var(--text-secondary)]",
  accent:
    "border-[color:var(--brand-gold)]/40 text-[color:var(--brand-gold)]",
  success:
    "border-[color:var(--success)]/40 text-[color:var(--success)]",
  danger:
    "border-[color:var(--danger)]/40 text-[color:var(--danger)]",
  muted:
    "border-[color:var(--border-subtle)] text-[color:var(--text-muted)]",
  info: "border-[color:var(--info)]/40 text-[color:var(--info)]",
};

const dotColor: Record<BadgeVariant, string> = {
  neutral: "bg-[color:var(--text-muted)]",
  accent: "bg-gold-grad",
  success: "bg-[color:var(--success)]",
  danger: "bg-[color:var(--danger)]",
  muted: "bg-[color:var(--text-subtle)]",
  info: "bg-[color:var(--info)]",
};

const sizeClass: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[9px] gap-1",
  md: "px-2.5 py-1 text-[10px] gap-1.5",
};

export function Badge({
  variant = "neutral",
  size = "sm",
  dot = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-xs)] border font-semibold uppercase tracking-[0.16em]",
        sizeClass[size],
        variantClass[variant],
        className,
      )}
      {...rest}
    >
      {dot ? <span className={cn("size-1.5 rounded-full", dotColor[variant])} /> : null}
      {children}
    </span>
  );
}
