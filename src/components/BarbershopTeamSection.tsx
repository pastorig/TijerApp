"use client";

import { useEffect, useState } from "react";
import type { Barber } from "@/data/demo-barbershops";
import { listActiveBarbersByBarbershop } from "@/lib/barbers";
import { cn } from "@/lib/cn";

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
          isOwner: dbBarber.is_owner,
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
      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
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
                className={cn(
                  "group flex items-center gap-4 rounded-[var(--radius-md)] border bg-[color:var(--surface-1)] p-5 transition-colors duration-[var(--duration-fast)]",
                  barber.isOwner
                    ? "border-[color:var(--brand-gold)] shadow-[0_0_0_1px_color-mix(in_oklab,var(--brand-gold)_30%,transparent)]"
                    : "border-[color:var(--border-subtle)] hover:border-[color:var(--brand-gold)]/40",
                )}
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
