import { Gift, Sparkles } from "lucide-react";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type LoyaltyStatus = {
  visits_required: number;
  reward_name: string;
  reward_description: string | null;
  active_stamps: number;
  is_program_active: boolean;
};

/**
 * Card pública que muestra al cliente sus sellos de fidelidad acumulados.
 * Server component: trae el status via RPC y lo renderiza inline.
 * Si la barbería NO tiene programa activo, no se renderiza nada.
 */
export async function PublicLoyaltyCard({ token }: { token: string }) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc(
    "get_public_loyalty_status_by_token",
    { p_token: token },
  );

  if (error || !data) return null;
  const status = (data as LoyaltyStatus[])[0];
  if (!status || !status.is_program_active) return null;

  const stamps = Math.min(status.active_stamps, status.visits_required);
  const remaining = Math.max(0, status.visits_required - stamps);
  const canRedeem = stamps >= status.visits_required;

  return (
    <section className="mt-6 overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--brand-gold)]/20 bg-[color:var(--surface-1)]">
      <div className="border-b border-[color:var(--border-subtle)] bg-[color:var(--brand-gold-soft)]/40 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          {canRedeem ? (
            <Sparkles
              aria-hidden="true"
              className="size-4 shrink-0 text-[color:var(--brand-gold)]"
            />
          ) : (
            <Gift
              aria-hidden="true"
              className="size-4 shrink-0 text-[color:var(--brand-gold)]"
            />
          )}
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
            Fidelización
          </p>
        </div>
        <h2 className="mt-1 text-base font-bold text-white sm:text-lg">
          {canRedeem
            ? `🎉 ¡Premio disponible! ${status.reward_name}`
            : `${remaining} ${remaining === 1 ? "visita" : "visitas"} para ${status.reward_name}`}
        </h2>
        {status.reward_description ? (
          <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
            {status.reward_description}
          </p>
        ) : null}
      </div>

      {/* Grid de sellos */}
      <div className="p-4 sm:p-5">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(36px, 1fr))`,
          }}
        >
          {Array.from({ length: status.visits_required }).map((_, idx) => {
            const isFilled = idx < stamps;
            return (
              <div
                key={idx}
                className={
                  isFilled
                    ? "flex aspect-square items-center justify-center rounded-full border-2 border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)]"
                    : "flex aspect-square items-center justify-center rounded-full border-2 border-dashed border-[color:var(--border-default)] bg-transparent"
                }
                aria-label={
                  isFilled
                    ? `Sello ${idx + 1} obtenido`
                    : `Sello ${idx + 1} pendiente`
                }
              >
                {isFilled ? (
                  <Gift
                    aria-hidden="true"
                    className="size-3.5 text-[color:var(--brand-gold)] sm:size-4"
                  />
                ) : null}
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
          {stamps} / {status.visits_required} sellos
        </p>

        {canRedeem ? (
          <p className="mt-3 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] px-3 py-2 text-center text-xs leading-5 text-white">
            Mencionalo cuando te atiendan para canjearlo.
          </p>
        ) : null}
      </div>
    </section>
  );
}
