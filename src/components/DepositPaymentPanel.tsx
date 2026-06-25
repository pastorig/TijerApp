import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatPrice } from "@/lib/format";

type DepositStatus = "pending" | "paid" | "expired" | "failed" | null;

type DepositPaymentPanelProps = {
  amount: number | null | undefined;
  /** Estado de la seña. Default "pending". */
  status?: DepositStatus;
  /** Link de pago (init_point directo o /api/mp/pay?token=...). */
  payHref?: string;
  /** Nombre de la barbería, para el copy. */
  barbershopName?: string;
};

/**
 * Panel de pago de la seña. Reutilizado en el cierre del booking y en la
 * pantalla pública del turno (/r/[token]). Muestra el monto y, según el
 * estado, el botón para pagar / un check de pagada / aviso de expirada.
 */
export function DepositPaymentPanel({
  amount,
  status = "pending",
  payHref,
  barbershopName,
}: DepositPaymentPanelProps) {
  if (status === "paid") {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-4 py-3.5">
        <CheckCircle2
          className="size-5 shrink-0 text-[color:var(--success)]"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-bold text-[color:var(--success)]">
            Seña pagada
          </p>
          <p className="text-xs text-[color:var(--text-secondary)]">
            Tu turno quedó confirmado{barbershopName ? ` en ${barbershopName}` : ""}.
          </p>
        </div>
      </div>
    );
  }

  if (status === "expired" || status === "failed") {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] px-4 py-3.5">
        <XCircle
          className="size-5 shrink-0 text-[color:var(--danger)]"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-bold text-[color:var(--danger)]">
            Seña no pagada
          </p>
          <p className="text-xs text-[color:var(--text-secondary)]">
            El plazo venció y el turno se liberó. Reservá de nuevo si querés.
          </p>
        </div>
      </div>
    );
  }

  // pending
  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] p-4 ring-1 ring-[color:var(--brand-gold)]/15">
      <div className="flex items-start gap-2.5">
        <Clock
          className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-gold)]"
          aria-hidden="true"
        />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
            Falta pagar la seña
          </p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--text-secondary)]">
            Para confirmar el turno tenés que pagar la seña. El resto lo abonás
            en el local.
          </p>
        </div>
      </div>

      <p className="mt-3 font-mono text-3xl font-black tabular-nums leading-none text-[color:var(--brand-gold)]">
        {typeof amount === "number" ? formatPrice(amount) : "—"}
      </p>

      {payHref ? (
        <a
          href={payHref}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-4 text-[12px] font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)]"
        >
          Pagar seña
        </a>
      ) : null}

      <p className="mt-2.5 text-[10px] leading-4 text-[color:var(--text-subtle)]">
        Pago seguro vía MercadoPago. Si no pagás a tiempo, el turno se libera.
      </p>
    </div>
  );
}
