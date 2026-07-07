import { FOUNDER } from "@/lib/founder";
import { cn } from "@/lib/cn";

/**
 * Recuadro con los datos de transferencia para que el barbero active su plan:
 * monto + alias/CBU/titular del founder. Compartido entre el paywall de plan
 * vencido (RequirePlan → ExpiredPaywall) y el modal "Pagar" del banner de
 * trial/gracia (PlanStatusBanner), para que los datos de cobro aparezcan
 * SIEMPRE, sin importar desde qué superficie el barbero decide pagar.
 */
export function TransferDetailsCard({
  precio,
  className,
}: {
  /** Precio ya formateado, ej. "$61.000". */
  precio: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] p-4 text-left",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--brand-gold)]">
          A pagar
        </p>
        <p className="font-mono text-xl font-black tabular-nums text-[color:var(--brand-gold)]">
          {precio}
          <span className="ml-0.5 text-xs font-semibold text-[color:var(--text-muted)]">
            /mes
          </span>
        </p>
      </div>
      <dl className="mt-3 grid gap-1.5 text-xs">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[color:var(--text-muted)]">Alias</dt>
          <dd className="font-mono font-semibold text-white">{FOUNDER.alias}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="shrink-0 text-[color:var(--text-muted)]">CBU</dt>
          <dd className="break-all text-right font-mono font-semibold text-white">
            {FOUNDER.cbu}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[color:var(--text-muted)]">Titular</dt>
          <dd className="font-semibold text-white">{FOUNDER.titular}</dd>
        </div>
      </dl>
      <p className="mt-2.5 text-[11px] leading-4 text-[color:var(--text-muted)]">
        Transferí y avisá por WhatsApp para que activemos tu plan.
      </p>
    </div>
  );
}
