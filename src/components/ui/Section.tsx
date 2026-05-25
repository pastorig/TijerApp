import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionHeaderProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "start" | "between";
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = "between",
  className,
}: SectionHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3",
        align === "between" && "sm:flex-row sm:items-end sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h2 className="mt-3 text-2xl font-black tracking-tight text-balance text-[color:var(--text-primary)] sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)]",
        className,
      )}
    >
      {children}
    </p>
  );
}

type PageShellProps = {
  children: ReactNode;
  className?: string;
  max?: "md" | "lg" | "xl";
};

const maxClass: Record<NonNullable<PageShellProps["max"]>, string> = {
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
};

export function PageShell({ children, className, max = "xl" }: PageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-20",
        maxClass[max],
        className,
      )}
    >
      {children}
    </div>
  );
}
