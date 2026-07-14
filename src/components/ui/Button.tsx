"use client";

import { forwardRef } from "react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "success"
  | "danger"
  | "subtle";

type ButtonSize = "sm" | "md" | "lg";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
};

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    as?: "button";
  };

type ButtonAsLink = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    as: "link";
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const base =
  "inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.12em] " +
  "transition-colors duration-[var(--duration-base)] ease-[var(--ease-out-soft)] " +
  "outline-none focus-visible:outline-1 focus-visible:outline-[color:var(--brand-gold)] focus-visible:outline-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-40 select-none";

const sizeClass: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-[10px]",
  md: "min-h-11 px-5 text-[11px]",
  lg: "min-h-13 px-7 text-xs",
};

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-gold-grad text-black hover:bg-[color:var(--brand-gold-hi)]",
  secondary:
    "border border-[color:var(--border-default)] text-[color:var(--text-primary)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]",
  ghost:
    "text-[color:var(--text-secondary)] hover:text-[color:var(--brand-gold)]",
  success:
    "border border-[color:var(--success)]/40 text-[color:var(--success)] hover:border-[color:var(--success)] hover:bg-[color:var(--success-soft)]",
  danger:
    "border border-[color:var(--danger)]/40 text-[color:var(--danger)] hover:border-[color:var(--danger)] hover:bg-[color:var(--danger-soft)]",
  subtle:
    "bg-[color:var(--surface-2)] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)]",
};

const spinnerSize: Record<ButtonSize, string> = {
  sm: "size-3.5",
  md: "size-3.5",
  lg: "size-4",
};

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(props, ref) {
    const {
      variant = "primary",
      size = "md",
      loading = false,
      iconLeft,
      iconRight,
      fullWidth = false,
      className,
      children,
      ...rest
    } = props;

    const classes = cn(
      base,
      sizeClass[size],
      variantClass[variant],
      fullWidth && "w-full",
      className,
    );

    const content = (
      <>
        {loading ? (
          <Loader2
            className={cn(spinnerSize[size], "animate-spin")}
            aria-hidden="true"
          />
        ) : iconLeft ? (
          <span className="inline-flex shrink-0">{iconLeft}</span>
        ) : null}
        <span className="truncate">{children}</span>
        {!loading && iconRight ? (
          <span className="inline-flex shrink-0">{iconRight}</span>
        ) : null}
      </>
    );

    if (props.as === "link") {
      const { as: _as, href, ...anchorRest } =
        rest as AnchorHTMLAttributes<HTMLAnchorElement> & { as: "link"; href: string };
      void _as;
      return (
        <Link
          href={href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={classes}
          aria-busy={loading || undefined}
          {...anchorRest}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={classes}
        aria-busy={loading || undefined}
        disabled={loading || (rest as ButtonHTMLAttributes<HTMLButtonElement>).disabled}
        {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {content}
      </button>
    );
  },
);
