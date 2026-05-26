import { ArrowUpRight } from "lucide-react";
import { Button, Logo } from "@/components/ui";

const principles = [
  {
    number: "01",
    title: "Reservas por barbería",
    body: "Cada local con su propio espacio público y agenda.",
  },
  {
    number: "02",
    title: "Multi-barbero nativo",
    body: "Servicios, horarios y disponibilidad por profesional.",
  },
  {
    number: "03",
    title: "Operativo, no decorativo",
    body: "Panel admin compacto, mobile-first, para usar mientras se trabaja.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-8 sm:py-6 lg:px-12">
        <Logo variant="mark" size="md" className="sm:hidden" />
        <Logo size="md" className="hidden sm:inline-flex" />
        <div className="flex items-center gap-1">
          <Button as="link" href="/sv-barber" variant="ghost" size="sm">
            Demo
          </Button>
          <Button as="link" href="/login" variant="secondary" size="sm">
            Iniciar sesión
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-8 sm:pb-24 sm:pt-8 lg:px-12 lg:pb-28 lg:pt-12">
        <div className="animate-fade-up">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
            Plataforma SaaS · Argentina
          </p>
          <h1 className="mt-6 max-w-4xl text-[2.25rem] font-black uppercase leading-[0.95] tracking-tight text-balance sm:mt-8 sm:text-6xl lg:text-7xl lg:leading-[0.9] xl:text-[112px]">
            Turnos online
            <br />
            <span className="text-[color:var(--brand-gold)]">para barberías</span>
            <br />
            <span className="text-[color:var(--brand-silver)]">modernas.</span>
          </h1>

          <p className="mt-8 max-w-xl text-base leading-7 text-[color:var(--text-secondary)] sm:mt-10 sm:text-lg sm:leading-8">
            BarberSync centraliza reservas, barberos, servicios y agenda en una
            plataforma operativa. Cada barbería con su espacio y su admin.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:mt-12 sm:flex-row">
            <Button
              as="link"
              href="/login"
              size="lg"
              iconRight={<ArrowUpRight className="size-4" />}
              className="w-full sm:w-auto"
            >
              Iniciar sesión
            </Button>
            <Button
              as="link"
              href="/sv-barber"
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
            >
              Ver demo SV Barber
            </Button>
          </div>
        </div>
      </section>

      {/* Hairline divider */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-8 lg:px-12">
        <div className="hairline-gold" />
      </div>

      {/* Principles — grid de 3 columnas, minimal */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-28">
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-8 lg:gap-16">
          {principles.map((principle, index) => (
            <div
              key={principle.number}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <p className="font-mono text-xs font-semibold tracking-[0.2em] text-[color:var(--brand-gold)]">
                {principle.number}
              </p>
              <h3 className="mt-4 text-xl font-bold uppercase tracking-tight text-white sm:text-2xl">
                {principle.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[color:var(--text-muted)]">
                {principle.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-[color:var(--border-subtle)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
            <div className="w-full sm:w-auto">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
                Probar ahora
              </p>
              <h2 className="mt-4 max-w-2xl text-[1.75rem] font-black uppercase leading-[1.05] tracking-tight text-balance sm:text-4xl lg:text-5xl">
                Reservá un turno en menos de 60s.
              </h2>
            </div>
            <Button
              as="link"
              href="/sv-barber/reservar"
              size="lg"
              iconRight={<ArrowUpRight className="size-4" />}
              className="w-full sm:w-auto"
            >
              Probar demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[color:var(--border-subtle)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <Logo variant="wordmark" size="sm" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)] sm:tracking-[0.2em]">
            © {new Date().getFullYear()} BarberSync · Todos los derechos reservados
          </p>
        </div>
      </footer>
    </main>
  );
}
