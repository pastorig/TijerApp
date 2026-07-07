import { cn } from "@/lib/cn";

/** Iniciales (máx 2) a partir de un nombre. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type InitialsAvatarProps = {
  name: string;
  /** Resalta el avatar (barbero seleccionado). */
  active?: boolean;
  className?: string;
};

/** Círculo con las iniciales del barbero. Gold cuando está activo. */
export function InitialsAvatar({ name, active, className }: InitialsAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full border text-[13px] font-black uppercase tracking-tight transition-colors",
        active
          ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)] text-black"
          : "border-[color:var(--border-default)] bg-[color:var(--surface-2)] text-[color:var(--text-secondary)]",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
