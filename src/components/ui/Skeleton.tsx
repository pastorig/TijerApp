import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...rest }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton rounded-[var(--radius-sm)] h-4 w-full",
        className,
      )}
      aria-hidden="true"
      {...rest}
    />
  );
}
