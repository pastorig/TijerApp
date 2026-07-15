import {
  CalendarDays,
  Clock,
  LineChart,
  MessageCircle,
  Smartphone,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "./ui/Reveal";
import {
  VizAgenda,
  VizMultiBarbero,
  VizOcupacion,
  VizReportes,
  VizReservas,
  VizWhatsApp,
} from "./ui/FeatureVisuals";

type Feature = {
  icon: LucideIcon;
  viz: () => React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
};

const FEATURES: Feature[] = [
  {
    icon: CalendarDays,
    viz: VizAgenda,
    title: "Turnero del día",
    description:
      "Una vista clara con todos los turnos de hoy en una línea de tiempo real. Arrastrá para reprogramar y confirmá con un toque.",
    bullets: [
      "Bloques a escala según la duración del corte",
      "Arrastrar y soltar para cambiar hora o barbero",
      "Huecos libres visibles de un vistazo",
    ],
  },
  {
    icon: Users,
    viz: VizMultiBarbero,
    title: "Multi-barbero nativo",
    description:
      "Cada barbero con sus servicios, sus duraciones y sus horarios semanales. Un solo local, varias agendas en simultáneo.",
    bullets: [
      "Servicios y precios por barbero",
      "Horarios distintos por día de la semana",
      "Barbero 'cabeza' destacado en la página pública",
    ],
  },
  {
    icon: Smartphone,
    viz: VizReservas,
    title: "Reservas públicas",
    description:
      "Tus clientes reservan desde el celular sin crear cuenta. Solo nombre y teléfono. Slots calculados al instante según disponibilidad real.",
    bullets: [
      "Sin instalación, sin descargas",
      "Bloqueo a nivel base de datos contra duplicados",
      "Confirmación del turno por link público",
    ],
  },
  {
    icon: Clock,
    viz: VizOcupacion,
    title: "Aprovechá tu horario",
    description:
      "El admin te muestra cuántos cortes entran en tu jornada según la duración de cada servicio, y te sugiere extender el cierre si sobran minutos.",
    bullets: [
      "Análisis por barbero y servicio",
      "Sugerencia 'cerrá a las X para meter 1 corte más'",
      "Botón para aplicar la sugerencia con un click",
    ],
  },
  {
    icon: MessageCircle,
    viz: VizWhatsApp,
    title: "WhatsApp integrado",
    description:
      "Mandá el detalle del turno por WhatsApp con un toque, manteniendo el envío separado de la confirmación interna.",
    bullets: [
      "Link wa.me con mensaje pre-armado",
      "Confirmación del cliente desde un link",
      "Recordatorios automáticos por email",
    ],
  },
  {
    icon: LineChart,
    viz: VizReportes,
    title: "Reportes y métricas",
    description:
      "KPIs claros para entender cómo va tu negocio: ingresos confirmados, ingresos potenciales, tasa de cancelación, día más activo y más.",
    bullets: [
      "Producción por barbero",
      "Top servicios y horarios pico",
      "Clientes nuevos vs recurrentes en el período",
    ],
  },
];

export function ProductFeatures() {
  return (
    <section className="relative border-t border-[color:var(--border-subtle)]">
      {/* Textura de grilla tenue de fondo */}
      <div
        aria-hidden="true"
        className="bg-grid-faint pointer-events-none absolute inset-0 -z-10 opacity-40"
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <header className="text-center sm:text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Qué incluye
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            Todo lo que tu barbería{" "}
            <span className="text-gold-gradient">necesita</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[color:var(--text-secondary)] sm:mx-0 sm:text-lg">
            Una plataforma pensada para usarla mientras se trabaja: rápida,
            mobile-first y sin pasos innecesarios.
          </p>
        </header>

        <ul className="mt-8 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            const Viz = feature.viz;
            return (
              <Reveal
                as="li"
                key={feature.title}
                delay={(index % 3) * 80}
                className="card-premium card-premium-hover group flex flex-col p-4 sm:p-5"
              >
                <Viz />
                <div className="mt-4 flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)] transition-transform duration-[var(--duration-fast)] group-hover:scale-105"
                    style={{
                      boxShadow: "0 0 20px -8px rgba(201,162,62,0.6)",
                    }}
                  >
                    <Icon className="size-5" />
                  </span>
                  <h3 className="text-base font-bold leading-tight text-white sm:text-lg">
                    {feature.title}
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
                  {feature.description}
                </p>
                <ul className="mt-4 grid gap-1.5 border-t border-[color:var(--border-subtle)] pt-4">
                  {feature.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2 text-xs leading-5 text-[color:var(--text-muted)]"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-gold-soft)] text-[8px] text-[color:var(--brand-gold)]"
                      >
                        ✓
                      </span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
