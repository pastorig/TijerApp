"use client";

import { useEffect, useState } from "react";
import { Info, Loader2, Wallet } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { formatPrice } from "@/lib/format";

/**
 * Lo que el empleado lleva ganado en el período.
 *
 * El número sale de `/api/staff/earnings`, que lo calcula con la misma función
 * que usa el dueño para su liquidación (feature 014). Acá NO se hace ninguna
 * cuenta: si esta pantalla multiplicara por su lado, tarde o temprano mostraría
 * algo distinto de lo que ve el dueño, y esa diferencia es una discusión con
 * plata de por medio.
 */

type Ganancias = {
  periodo: { desde: string; hasta: string };
  turnos: number;
  produccion: number;
  comisionPorcentaje: number | null;
  comision: number | null;
};

/** Primer y último día de un mes, en el calendario argentino. */
function rangoDelMes(offsetMeses: number): { desde: string; hasta: string } {
  const ahora = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [anio, mes] = ahora.split("-").map(Number);
  const base = new Date(Date.UTC(anio, mes - 1 + offsetMeses, 1));
  const desde = base.toISOString().slice(0, 10);
  const fin = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0),
  );
  return { desde, hasta: fin.toISOString().slice(0, 10) };
}

function nombreDelMes(desde: string): string {
  const [a, m] = desde.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(a, m - 1, 1)));
}

export function StaffEarnings({ barbershopSlug }: { barbershopSlug: string }) {
  const [offset, setOffset] = useState(0);
  const [datos, setDatos] = useState<Ganancias | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Mismo patrón que el resto del panel: la función vive DENTRO del efecto.
  useEffect(() => {
    let vivo = true;
    async function cargar() {
      setCargando(true);
      setError("");
      try {
        const { desde: d, hasta: h } = rangoDelMes(offset);
        const { data: sessionData } = await getCurrentSession();
        const token = sessionData.session?.access_token;
        if (!vivo) return;
        if (!token) {
          setError("Se cerró tu sesión. Volvé a entrar.");
          return;
        }
        const res = await fetch(
          `/api/staff/earnings?bs=${encodeURIComponent(barbershopSlug)}&desde=${d}&hasta=${h}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const payload = (await res.json().catch(() => ({}))) as Ganancias & {
          error?: string;
        };
        if (!vivo) return;
        if (!res.ok) {
          setError(payload.error ?? "No pudimos calcular tus ganancias.");
          return;
        }
        setDatos(payload);
      } catch {
        if (vivo) setError("No pudimos calcular tus ganancias.");
      } finally {
        if (vivo) setCargando(false);
      }
    }
    cargar();
    return () => {
      vivo = false;
    };
  }, [barbershopSlug, offset]);

  const { desde } = rangoDelMes(offset);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--brand-gold)]">
          Mis ganancias
        </p>
        <h1 className="mt-1 text-2xl font-black capitalize tracking-tight text-white">
          {nombreDelMes(desde)}
        </h1>
      </header>

      <div className="mb-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOffset((o) => o - 1)}
          className="min-h-10 flex-1 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] text-xs font-bold text-white"
        >
          ← Mes anterior
        </button>
        <button
          type="button"
          onClick={() => setOffset(0)}
          disabled={offset === 0}
          className="min-h-10 flex-1 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] text-xs font-bold text-white disabled:opacity-40"
        >
          Este mes
        </button>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset === 0}
          className="min-h-10 flex-1 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] text-xs font-bold text-white disabled:opacity-40"
        >
          Siguiente →
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-[color:var(--danger)]"
        >
          {error}
        </p>
      ) : null}

      {cargando ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-[color:var(--text-muted)]" />
        </div>
      ) : datos ? (
        <div className="flex flex-col gap-3">
          <section className="card-premium p-5">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--brand-gold)]">
              <Wallet className="size-3.5" />
              Tu comisión
            </p>
            {datos.comision === null ? (
              /* Sin comisión configurada NO se muestra $0: "cero" se lee como
                 "no ganaste nada", y lo que pasa es que falta un dato. */
              <p className="mt-3 flex items-start gap-2 text-sm leading-5 text-[color:var(--text-secondary)]">
                <Info className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-gold)]" />
                Tu comisión todavía no está configurada. Hablalo con el dueño de
                la barbería y acá vas a ver cuánto te corresponde.
              </p>
            ) : (
              <>
                <p className="stat-number mt-2 w-fit bg-gradient-to-br from-[color:var(--brand-gold-hi)] via-[color:var(--brand-gold)] to-[color:var(--brand-gold-lo)] bg-clip-text text-4xl font-black tabular-nums leading-none text-transparent">
                  {formatPrice(datos.comision)}
                </p>
                <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                  {datos.comisionPorcentaje}% de {formatPrice(datos.produccion)}
                </p>
              </>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3">
            <section className="card-premium p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                Producción
              </p>
              <p className="mt-2 text-xl font-black tabular-nums text-white">
                {formatPrice(datos.produccion)}
              </p>
            </section>
            <section className="card-premium p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                Turnos
              </p>
              <p className="mt-2 text-xl font-black tabular-nums text-white">
                {datos.turnos}
              </p>
            </section>
          </div>

          <p className="px-1 text-[11px] leading-4 text-[color:var(--text-subtle)]">
            Cuenta los turnos confirmados y los pendientes. Los cancelados no
            suman.
          </p>
        </div>
      ) : null}
    </div>
  );
}
