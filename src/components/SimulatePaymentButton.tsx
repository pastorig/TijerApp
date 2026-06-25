"use client";

import { useState } from "react";

/**
 * SOLO TESTING. Botón que simula el pago de la seña sin pasar por MercadoPago.
 * Visible únicamente si NEXT_PUBLIC_ALLOW_DEPOSIT_SIMULATION === "true".
 * Sirve para comprobar el flujo (turno → "seña pagada" → confirmado) sin
 * credenciales de MP.
 */
export function SimulatePaymentButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (process.env.NEXT_PUBLIC_ALLOW_DEPOSIT_SIMULATION !== "true") {
    return null;
  }

  async function simulate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/mp/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "No se pudo simular el pago.");
        return;
      }
      // Recargamos para que se vea el estado actualizado (seña pagada).
      window.location.reload();
    } catch {
      setError("No se pudo simular el pago.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 rounded-[var(--radius-sm)] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-1)] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
        Modo prueba
      </p>
      <button
        type="button"
        onClick={simulate}
        disabled={loading}
        className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--success)] transition-colors hover:bg-[color:var(--success)]/20 disabled:opacity-60"
      >
        {loading ? "Simulando…" : "Simular pago aprobado (test)"}
      </button>
      {error ? (
        <p className="mt-2 text-xs font-semibold text-[color:var(--danger)]">
          {error}
        </p>
      ) : null}
      <p className="mt-2 text-[10px] leading-4 text-[color:var(--text-subtle)]">
        Solo visible en modo prueba. Marca la seña como pagada sin MercadoPago.
      </p>
    </div>
  );
}
