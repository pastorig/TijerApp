"use client";

import { ArrowUp, Lock } from "lucide-react";

type PasoPendienteProps = {
  /** Qué le falta hacer, en una línea y en criollo. */
  texto: string;
  /** Id del paso al que hay que volver. Si está, el aviso lleva hasta ahí. */
  irA?: string;
  irLabel?: string;
};

/**
 * Aviso de que este paso todavía no se puede usar porque falta uno de arriba.
 *
 * ── Por qué es tan grande ───────────────────────────────────────────────────
 * Antes esto era una línea de 11px en gris apagado, y no funcionaba: la gente
 * bajaba directo a la fecha, tocaba un día, no pasaba nada y se iba pensando
 * que no había turnos. El aviso tiene que competir con el resto de la pantalla,
 * no esconderse. Por eso va con el dorado de la marca, un candado y —lo que más
 * ayuda en el celular— un botón que los sube de vuelta al paso que falta, en
 * lugar de pedirles que scrolleen a buscarlo.
 */
export function PasoPendiente({ texto, irA, irLabel }: PasoPendienteProps) {
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2.5 text-sm font-semibold leading-5 text-white">
        <Lock
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-gold)]"
        />
        {texto}
      </p>

      {irA ? (
        <button
          type="button"
          onClick={() => {
            document
              .getElementById(irA)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/50 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold)]/15"
        >
          <ArrowUp aria-hidden="true" className="size-3.5" />
          {irLabel ?? "Ir al paso"}
        </button>
      ) : null}
    </div>
  );
}
