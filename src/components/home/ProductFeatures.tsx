import {
  CalendarDays,
  Clock,
  LineChart,
  MessageCircle,
  Smartphone,
  Users,
} from "lucide-react";

type Feature = {
  icon: typeof CalendarDays;
  title: string;
  description: string;
  bullets: string[];
};

const FEATURES: Feature[] = [
  {
    icon: CalendarDays,
    title: "Turnero del día",
    description:
      "Una vista clara con todos los turnos de hoy, ordenados por hora, listos para confirmar o cancelar con un toque.",
    bullets: [
      "Calendario con vista semanal y mensual",
      "Swipe en mobile y drag en desktop para cambiar semana",
      "Huecos libres entre turnos con cortes posibles",
    ],
  },
  {
    icon: Users,
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
    title: "Reservas públicas",
    description:
      "Tus clientes reservan desde el celular sin crear cuenta. Solo nombre y teléfono. Slots calculados al instante según disponibilidad real.",
    bullets: [
      "Sin instalación, sin descargas",
      "Bloqueo a nivel base de datos contra reservas duplicadas",
      "Confirmación del turno por link público",
    ],
  },
  {
    icon: Clock,
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
    title: "WhatsApp integrado",
    description:
      "Mandá el detalle del turno por WhatsApp con un toque, manteniendo el envío separado de la confirmación interna.",
    bullets: [
      "Link wa.me con mensaje pre-armado",
      "Confirmación del cliente desde un link",
      "Recordatorios automáticos por email (próximamente)",
    ],
  },
  {
    icon: LineChart,
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
    <section className="border-t border-[color:var(--border-subtle)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <header className="text-center sm:text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Qué incluye
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            Todo lo que tu barbería necesita
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[color:var(--text-secondary)] sm:mx-0 sm:text-lg">
            Una plataforma pensada para usarla mientras se trabaja: rápida,
            mobile-first y sin pasos innecesarios.
          </p>
        </header>

        <ul className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <li
                key={feature.title}
                className="hover-glow flex flex-col items-start gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-3 sm:gap-4 sm:p-6"
              >
                <div
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)] sm:size-11"
                >
                  <Icon className="size-4 sm:size-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold leading-tight text-white sm:text-lg">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-5 text-[color:var(--text-secondary)] sm:mt-2 sm:text-sm sm:leading-6">
                    {feature.description}
                  </p>
                </div>
                <ul className="mt-auto hidden gap-1.5 border-t border-[color:var(--border-subtle)] pt-4 sm:grid">
                  {feature.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="text-xs leading-5 text-[color:var(--text-muted)]"
                    >
                      <span
                        aria-hidden="true"
                        className="mr-2 text-[color:var(--brand-gold)]"
                      >
                        ✓
                      </span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
