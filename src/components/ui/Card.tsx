import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardVariant = "default" | "elevated" | "accent" | "flat" | "outline";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
};

const variantClass: Record<CardVariant, string> = {
  default: "bg-[color:var(--surface-1)] border border-[color:var(--border-default)]",
  elevated: "bg-[color:var(--surface-1)] border border-[color:var(--border-default)] shadow-elevated",
  accent: "bg-[color:var(--brand-gold-soft)] border border-[color:var(--brand-gold)]/30",
  flat: "bg-[color:var(--surface-1)] border border-[color:var(--border-subtle)]",
  outline: "border border-[color:var(--border-default)]",
};

const paddingClass: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function Card({
  variant = "default",
  padding = "md",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)]",
        variantClass[variant],
        paddingClass[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
