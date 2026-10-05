"use client";

import { useEffect, useState } from "react";
import type { Barber } from "@/data/demo-barbershops";
import { listActiveBarbersByBarbershop } from "@/lib/barbers";
import { cn } from "@/lib/cn";
import { Brillo, Escalera, Peldano } from "@/components/public/LandingMotion";

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
        <Escalera as="header" paso={0.09} className="text-center sm:text-left">
          <Peldano as="p" className="text-xs font-semibold uppercase tracking-normal text-[color:var(--brand-gold)]">
            Equipo
          </Peldano>
          <Peldano as="h2" className="mt-3 text-2xl font-black uppercase tracking-normal text-white sm:mt-4 sm:text-3xl lg:text-4xl">
            Nuestros barberos
          </Peldano>
        </Escalera>

        <Escalera className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {barbers.map((barber) => {
            const displayName =
              barber.displayName?.trim() || barber.name.trim();
            return (
              <Peldano
                key={barber.id}
                levanta
                className={cn(
                  "group relative flex items-center gap-4 rounded-[var(--radius-md)] border bg-[color:var(--surface-1)] p-5 transition-colors duration-[var(--duration-fast)]",
                  barber.isOwner
                    ? "border-[color:var(--brand-gold)] shadow-[0_0_0_1px_color-mix(in_oklab,var(--brand-gold)_30%,transparent)]"
                    : "border-[color:var(--border-subtle)] hover:border-[color:var(--brand-gold)]/40",
                )}
              >
                <Brillo />
                <div
                  aria-hidden="true"
                  className="relative transition-transform duration-[var(--duration-base)] ease-out group-hover:-rotate-6 group-hover:scale-110 flex size-14 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] font-mono text-base font-black uppercase text-[color:var(--brand-gold)]"
                >
                  {getInitials(displayName)}
                </div>
                <div className="relative min-w-0">
                  <p className="truncate text-base font-bold text-white">
                    {displayName}
                  </p>
                  {barber.role ? (
                    <p className="mt-1 truncate text-xs font-semibold uppercase tracking-normal text-[color:var(--text-muted)]">
                      {barber.role}
                    </p>
                  ) : null}
                </div>
              </Peldano>
            );
          })}
        </Escalera>
      </div>
    </section>
  );
}
