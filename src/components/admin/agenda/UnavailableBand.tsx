import { cn } from "@/lib/cn";
import type { FranjaNoDisponible } from "@/lib/agenda-layout";

/**
 * Franja de la columna donde el barbero no atiende: antes de abrir, después de
 * cerrar, la pausa o un bloqueo. Va por debajo de los turnos y no captura
 * toques: si hay un turno cargado ahí, se ve y se toca igual.
 */
export function UnavailableBand({
  franja,
  topPx,
  altoPx,
}: {
  franja: FranjaNoDisponible;
  topPx: number;
  altoPx: number;
}) {
  const conEtiqueta = franja.tipo !== "fuera-de-horario" && altoPx >= 22;
  return (
    <div
      aria-hidden={!conEtiqueta}
      className={cn(
        "pointer-events-none absolute inset-x-0 z-[1]",
        "[background-image:repeating-linear-gradient(135deg,transparent_0_6px,var(--border-subtle)_6px_7px)]",
        franja.tipo === "fuera-de-horario"
          ? "bg-black/30"
          : "border-y border-[color:var(--border-default)] bg-[color:var(--surface-0)]/50",
      )}
      style={{ top: topPx, height: altoPx }}
    >
      {conEtiqueta ? (
        <span className="absolute left-2 top-1 rounded-[var(--radius-xs)] bg-[color:var(--surface-1)] px-1.5 text-xs font-medium text-[color:var(--text-secondary)]">
          {franja.etiqueta}
        </span>
      ) : null}
    </div>
  );
}
