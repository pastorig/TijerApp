import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
  className?: string;
};

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  optional,
  children,
  className,
}: FieldProps) {
  const describedById = hint || error ? `${htmlFor}-desc` : undefined;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]"
      >
        {label}
        {required ? <span className="ml-1 text-[color:var(--brand-accent)]">*</span> : null}
        {optional ? <span className="ml-1 text-[color:var(--text-subtle)] normal-case font-normal tracking-normal">(opcional)</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={describedById} className="text-xs text-[color:var(--text-subtle)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={describedById}
          role="alert"
          className="text-xs font-semibold text-[color:var(--danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
