"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Scissors,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { MetricCard } from "@/components/admin/MetricCard";
import { Button, Card, Eyebrow } from "@/components/ui";

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
  // Mayúscula solo en la primera letra: `capitalize` de CSS la pone en cada
  // palabra y deja "Agosto De 2026".
  const texto = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(a, m - 1, 1)));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
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
    <div className="flex flex-col gap-5">
      {/* Encabezado y navegación en la misma fila, como el resto del panel: el
          mes que se está mirando y las flechas para moverlo van juntos. */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Mis ganancias</Eyebrow>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {nombreDelMes(desde)}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOffset((o) => o - 1)}
            iconLeft={<ChevronLeft className="size-3.5" />}
          >
            Anterior
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOffset(0)}
            disabled={offset === 0}
          >
            Este mes
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            disabled={offset === 0}
            iconRight={<ChevronRight className="size-3.5" />}
          >
            Siguiente
          </Button>
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-[color:var(--danger)]"
        >
          {error}
        </p>
      ) : null}

      {cargando ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-[color:var(--text-muted)]" />
        </div>
      ) : datos ? (
        <div className="flex flex-col gap-4">
          <MetricCard label="Tu comisión" icon={Wallet}>
            {datos.comision === null ? (
              /* Sin comisión configurada NO se muestra $0: "cero" se lee como
                 "no ganaste nada", y lo que pasa es que falta un dato. */
              <p className="flex items-start gap-2 text-sm leading-5 text-[color:var(--text-secondary)]">
                <Info className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-gold)]" />
                Tu comisión todavía no está configurada. Hablalo con el dueño de
                la barbería y acá vas a ver cuánto te corresponde.
              </p>
            ) : (
              <>
                <p className="stat-number w-fit bg-gradient-to-br from-[color:var(--brand-gold-hi)] via-[color:var(--brand-gold)] to-[color:var(--brand-gold-lo)] bg-clip-text text-4xl font-black tabular-nums leading-none text-transparent">
                  {formatPrice(datos.comision)}
                </p>
                <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                  {datos.comisionPorcentaje}% de {formatPrice(datos.produccion)}
                </p>
              </>
            )}
          </MetricCard>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Producción" icon={TrendingUp}>
              <p className="stat-number text-xl font-black tabular-nums text-white">
                {formatPrice(datos.produccion)}
              </p>
            </MetricCard>
            <MetricCard label="Turnos" icon={Scissors}>
              <p className="stat-number text-xl font-black tabular-nums text-white">
                {datos.turnos}
              </p>
            </MetricCard>
          </div>

          <Card variant="flat" padding="sm">
            <p className="text-[11px] leading-4 text-[color:var(--text-subtle)]">
              Cuenta los turnos confirmados y los pendientes. Los cancelados no
              suman.
            </p>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
