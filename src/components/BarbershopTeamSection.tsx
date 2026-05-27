"use client";

import { useEffect, useState } from "react";
import type { Barber } from "@/data/demo-barbershops";
import { listActiveBarbersByBarbershop } from "@/lib/barbers";

type BarbershopTeamSectionProps = {
  barbershopSlug: string;
  fallbackBarbers: Barber[];
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function BarbershopTeamSection({
  barbershopSlug,
  fallbackBarbers,
}: BarbershopTeamSectionProps) {
  const [barbers, setBarbers] = useState<Barber[]>(
    fallbackBarbers.filter((barber) => barber.isActive),
  );

  useEffect(() => {
    let isMounted = true;
    async function loadBarbers() {
      const { data } = await listActiveBarbersByBarbershop(barbershopSlug);
      if (!isMounted || !data || data.length === 0) return;
      setBarbers(
        data.map((dbBarber) => ({
          id: dbBarber.id,
          name: dbBarber.name,
          displayName: dbBarber.display_name ?? undefined,
          role: dbBarber.role ?? undefined,
          whatsapp: dbBarber.whatsapp ?? undefined,
          isActive: dbBarber.is_active,
          services: [],
        })),
      );
    }
    loadBarbers();
    return () => {
      isMounted = false;
    };
  }, [barbershopSlug]);

  if (barbers.length === 0) return null;

  return (
    <section className="border-t border-[color:var(--border-subtle)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
        <header className="text-center sm:text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Equipo
          </p>
          <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white sm:mt-4 sm:text-3xl lg:text-4xl">
            Nuestros barberos
          </h2>
        </header>

        <ul className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {barbers.map((barber) => {
            const displayName =
              barber.displayName?.trim() || barber.name.trim();
            return (
              <li
                key={barber.id}
                className="group flex items-center gap-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5 transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)]/40"
              >
                <div
                  aria-hidden="true"
                  className="flex size-14 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] font-mono text-base font-black uppercase text-[color:var(--brand-gold)]"
                >
                  {getInitials(displayName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-white">
                    {displayName}
                  </p>
                  {barber.role ? (
                    <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      {barber.role}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
