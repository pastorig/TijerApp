"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Calculator, TrendingDown, TrendingUp } from "lucide-react";

const TIJERAPP_PRO_ARS = 30000;

function formatArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function PricingRoiCalculator() {
  const [ticketPromedio, setTicketPromedio] = useState(7000);
  const [turnosPerdidos, setTurnosPerdidos] = useState(8);

  const dineroPerdidoPorMes = ticketPromedio * turnosPerdidos;
  const ahorroNeto = dineroPerdidoPorMes - TIJERAPP_PRO_ARS;
  const roiPositivo = ahorroNeto > 0;

  return (
    <section className="relative isolate overflow-hidden border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 70% at 50% 0%, color-mix(in oklab, var(--brand-gold) 10%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <header className="text-center">
          <div className="inline-flex items-center gap-2 text-[color:var(--brand-gold)]">
            <Calculator className="size-5" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em]">
              Calculadora de ROI
            </p>
          </div>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            ¿Cuánto te cuesta{" "}
            <span className="text-[color:var(--brand-gold)]">
              no usar TijerApp
            </span>
            ?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:mt-5 sm:text-base sm:leading-7">
            Calculá en 10 segundos cuánto pierde tu barbería por turnos
            olvidados, doble-bookings y agenda desorganizada.
          </p>
        </header>

        <div className="mt-10 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-5 sm:mt-12 sm:p-8">
          <div className="grid gap-5 sm:gap-8 lg:grid-cols-2">
            {/* Inputs */}
            <div className="space-y-5 sm:space-y-6">
              <div>
                <label
                  htmlFor="ticket"
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]"
                >
                  Ticket promedio por corte
                </label>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-white sm:text-2xl">
                    $
                  </span>
                  <input
                    id="ticket"
                    type="number"
                    min={1000}
                    max={50000}
                    step={500}
                    value={ticketPromedio}
                    onChange={(e) => setTicketPromedio(Number(e.target.value))}
                    className="w-full bg-transparent text-2xl font-black tracking-tight text-white outline-none sm:text-3xl"
                  />
                </div>
                <input
                  type="range"
                  min={2000}
                  max={20000}
                  step={500}
                  value={ticketPromedio}
                  onChange={(e) => setTicketPromedio(Number(e.target.value))}
                  className="mt-3 w-full accent-[color:var(--brand-gold)]"
                />
                <div className="mt-1 flex justify-between text-[10px] text-[color:var(--text-muted)]">
                  <span>$2.000</span>
                  <span>$20.000</span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="turnos"
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]"
                >
                  Turnos perdidos por mes
                </label>
                <p className="mt-1 text-[11px] text-[color:var(--text-muted)]">
                  Por olvido, doble-booking o cliente que no avisa.
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <input
                    id="turnos"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={turnosPerdidos}
                    onChange={(e) => setTurnosPerdidos(Number(e.target.value))}
                    className="w-full bg-transparent text-2xl font-black tracking-tight text-white outline-none sm:text-3xl"
                  />
                  <span className="text-sm text-[color:var(--text-secondary)]">
                    turnos / mes
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  value={turnosPerdidos}
                  onChange={(e) => setTurnosPerdidos(Number(e.target.value))}
                  className="mt-3 w-full accent-[color:var(--brand-gold)]"
                />
                <div className="mt-1 flex justify-between text-[10px] text-[color:var(--text-muted)]">
                  <span>0</span>
                  <span>30 turnos</span>
                </div>
              </div>
            </div>

            {/* Resultados */}
            <div className="space-y-4 rounded-[var(--radius-md)] border border-[color:var(--brand-gold)]/20 bg-black/30 p-5 sm:p-6">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--danger)]">
                  <TrendingDown className="size-3.5" />
                  Lo que perdés sin TijerApp
                </div>
                <div className="mt-2 text-3xl font-black tracking-tight text-[color:var(--danger)] sm:text-4xl">
                  ${formatArs(dineroPerdidoPorMes)}
                </div>
                <div className="text-xs text-[color:var(--text-muted)]">
                  por mes en turnos perdidos
                </div>
              </div>

              <div className="h-px bg-[color:var(--border-subtle)]" />

              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Costo TijerApp Pro
                </div>
                <div className="mt-1 text-lg font-bold text-white sm:text-xl">
                  ${formatArs(TIJERAPP_PRO_ARS)} / mes
                </div>
              </div>

              <div className="h-px bg-[color:var(--border-subtle)]" />

              <div>
                <div
                  className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] ${
                    roiPositivo
                      ? "text-[color:var(--brand-gold)]"
                      : "text-[color:var(--text-muted)]"
                  }`}
                >
                  <TrendingUp className="size-3.5" />
                  {roiPositivo ? "Ahorro neto mensual" : "Diferencia"}
                </div>
                <div
                  className={`mt-2 text-3xl font-black tracking-tight sm:text-4xl ${
                    roiPositivo
                      ? "text-[color:var(--brand-gold)]"
                      : "text-white"
                  }`}
                >
                  ${formatArs(Math.abs(ahorroNeto))}
                </div>
                <div className="text-xs text-[color:var(--text-secondary)]">
                  {roiPositivo
                    ? "Es lo que te queda en el bolsillo cada mes"
                    : "TijerApp se paga sola con apenas 5 turnos rescatados"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center sm:mt-8">
            <Link
              href="/#contacto"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-7 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:brightness-110 sm:w-auto"
            >
              Empezar prueba gratis
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <p className="mt-4 text-center text-[10px] text-[color:var(--text-muted)] sm:text-xs">
            * Cálculo estimado basado en datos de barberías argentinas con
            agenda desorganizada. Resultados reales pueden variar.
          </p>
        </div>
      </div>
    </section>
  );
}
