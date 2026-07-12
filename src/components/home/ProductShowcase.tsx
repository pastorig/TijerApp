import { BarChart3, CalendarClock, Smartphone } from "lucide-react";

type ShowcaseBlock = {
  icon: typeof Smartphone;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  mockup: "turnero" | "admin" | "publica" | "reportes";
};

const BLOCKS: ShowcaseBlock[] = [
  {
    icon: CalendarClock,
    eyebrow: "Turnero del día",
    title: "Tu agenda completa en una pantalla",
    description:
      "Todos los turnos de hoy ordenados por hora, con cliente, servicio, barbero y estado. Tocás un turno y lo confirmás, cancelás o mandás WhatsApp.",
    bullets: [
      "Vista semanal y mensual con swipe",
      "Huecos libres marcados con cortes posibles",
      "Bloqueo de doble-bookings a nivel base de datos",
    ],
    mockup: "turnero",
  },
  {
    icon: Smartphone,
    eyebrow: "Página pública",
    title: "Tus clientes reservan en 3 taps",
    description:
      "URL pública con tu marca, galería de fotos y formulario de reserva. Sin descargar app, sin crear cuenta. Solo nombre y teléfono.",
    bullets: [
      "Slots calculados según disponibilidad real",
      "Confirmación por link sin login",
      "Galería propia + presentación del equipo",
    ],
    mockup: "publica",
  },
  {
    icon: BarChart3,
    eyebrow: "Reportes y caja",
    title: "Sabés cuánto facturás de verdad",
    description:
      "Ingresos por barbero, top servicios, horarios pico y cierre de caja diario. Datos reales que te ayudan a tomar decisiones, no un dashboard adornado.",
    bullets: [
      "Reportes operativos en tiempo real",
      "Cierre de caja con detalle por método de pago",
      "Comparativas semana vs semana (tier Pro)",
    ],
    mockup: "reportes",
  },
];

function MockupTurnero() {
  return (
    <div className="mockup-frame aspect-[9/12] w-full max-w-[200px] bg-[color:var(--surface-1)] p-2.5 sm:aspect-[9/14] sm:max-w-[300px] sm:p-3">
      <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] pb-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--brand-gold)]">
          Turnero · Hoy
        </div>
        <div className="text-[9px] text-[color:var(--text-muted)]">12:30</div>
      </div>
      <div className="mt-3 space-y-1.5">
        {[
          { hora: "09:00", cliente: "Mateo", servicio: "Corte clásico", color: "green" },
          { hora: "09:30", cliente: "Juan P.", servicio: "Barba + corte", color: "green" },
          { hora: "10:00", cliente: "Tomás", servicio: "Corte fade", color: "green" },
          { hora: "10:30", cliente: "Lucas", servicio: "Corte clásico", color: "gold" },
          { hora: "11:00", cliente: "—", servicio: "Libre", color: "empty" },
          { hora: "11:30", cliente: "Diego", servicio: "Corte + barba", color: "gold" },
          { hora: "12:00", cliente: "Bruno", servicio: "Corte fade", color: "gold" },
          { hora: "12:30", cliente: "—", servicio: "Libre", color: "empty" },
        ].map((slot, idx) => (
          <div
            key={idx}
            className={
              slot.color === "empty"
                ? "flex items-center justify-between rounded-sm border border-dashed border-[color:var(--border-subtle)] bg-transparent px-2 py-1.5"
                : slot.color === "gold"
                  ? "flex items-center justify-between rounded-sm border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] px-2 py-1.5"
                  : "flex items-center justify-between rounded-sm border border-[color:var(--success)]/20 bg-[color:var(--success-soft)] px-2 py-1.5"
            }
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-[color:var(--text-muted)]">
                {slot.hora}
              </span>
              <span
                className={`text-[10px] font-semibold ${
                  slot.color === "empty"
                    ? "text-[color:var(--text-subtle)]"
                    : "text-white"
                }`}
              >
                {slot.cliente}
              </span>
            </div>
            <span
              className={`text-[9px] ${
                slot.color === "empty"
                  ? "text-[color:var(--text-subtle)]"
                  : "text-[color:var(--text-secondary)]"
              }`}
            >
              {slot.servicio}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockupPublica() {
  const slots = [
    { time: "16:00", state: "available" as const },
    { time: "16:30", state: "available" as const },
    { time: "17:00", state: "available" as const },
    { time: "17:30", state: "selected" as const },
    { time: "18:00", state: "available" as const },
    { time: "18:30", state: "available" as const },
    { time: "19:00", state: "available" as const },
    { time: "19:30", state: "available" as const },
    { time: "20:00", state: "taken" as const },
  ];

  return (
    <div className="mockup-frame aspect-[9/14] w-full max-w-[200px] bg-[color:var(--surface-1)] p-2 sm:max-w-[300px] sm:p-3">
      {/* Header con back arrow + isotipo */}
      <div className="flex items-center justify-between">
        <span className="text-[7px] font-bold uppercase tracking-wider text-[color:var(--brand-gold)] sm:text-[9px]">
          ← PRIME BARBER
        </span>
        <div className="size-3 rounded-sm bg-[color:var(--brand-gold)] sm:size-4" />
      </div>

      {/* Title block */}
      <div className="mt-2 border-b border-[color:var(--border-subtle)] pb-2">
        <div className="text-[7px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)] sm:text-[8px]">
          Reserva online
        </div>
        <div className="mt-0.5 text-sm font-black uppercase leading-none tracking-tight text-white sm:text-base">
          PRIME BARBER
        </div>
        <div className="mt-1 hidden text-[8px] leading-tight text-[color:var(--text-secondary)] sm:block sm:text-[9px]">
          Elegí servicio, fecha y horario.
        </div>
      </div>

      {/* Barbero */}
      <div className="mt-2">
        <div className="text-[7px] font-bold uppercase tracking-wider text-[color:var(--brand-gold)]">
          Barbero
        </div>
        <div className="mt-0.5 text-[10px] font-bold text-white sm:text-xs">
          Jeremias
        </div>
      </div>

      {/* Servicio dropdown */}
      <div className="mt-1.5">
        <div className="text-[7px] font-bold uppercase tracking-wider text-[color:var(--brand-gold)]">
          Servicio
        </div>
        <div className="mt-0.5 flex items-center justify-between rounded-sm border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-1.5 py-1">
          <span className="text-[9px] text-white">Corte — $8.500</span>
          <span className="text-[8px] text-[color:var(--text-muted)]">▾</span>
        </div>
      </div>

      {/* Fecha */}
      <div className="mt-1.5">
        <div className="text-[7px] font-bold uppercase tracking-wider text-[color:var(--brand-gold)]">
          Fecha
        </div>
        <div className="mt-0.5 flex items-center justify-between rounded-sm border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-1.5 py-1">
          <span className="text-[9px] text-white">06/06/2026</span>
          <span className="text-[8px] text-[color:var(--text-muted)]">📅</span>
        </div>
      </div>

      {/* Horario grid */}
      <div className="mt-1.5">
        <div className="text-[7px] font-bold uppercase tracking-wider text-[color:var(--brand-gold)]">
          Horario
        </div>
        <div className="mt-1 grid grid-cols-3 gap-1">
          {slots.map((slot) => (
            <div
              key={slot.time}
              className={
                slot.state === "selected"
                  ? "rounded-sm border border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)] py-1 text-center text-[8px] font-bold text-black"
                  : slot.state === "taken"
                    ? "rounded-sm border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] py-1 text-center text-[8px] font-bold text-[color:var(--text-subtle)] line-through"
                    : "rounded-sm border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] py-1 text-center text-[8px] font-bold text-[color:var(--brand-gold)]"
              }
            >
              {slot.time}
            </div>
          ))}
        </div>
      </div>

      {/* Footer: turno seleccionado + CTA reservar */}
      <div className="mt-2 flex items-center gap-1.5 border-t border-[color:var(--border-subtle)] pt-2">
        <div className="min-w-0 flex-1">
          <div className="text-[7px] uppercase tracking-wider text-[color:var(--text-muted)]">
            Tu turno
          </div>
          <div className="truncate text-[8px] font-semibold leading-tight text-white">
            17:30 · Corte · Jeremias
          </div>
        </div>
        <div className="rounded-sm bg-[color:var(--brand-gold)] px-2 py-1.5 text-[8px] font-bold uppercase tracking-wider text-black">
          Reservar
        </div>
      </div>
    </div>
  );
}

function MockupReportes() {
  return (
    <div className="mockup-frame aspect-[9/12] w-full max-w-[200px] bg-[color:var(--surface-1)] p-2.5 sm:aspect-[9/14] sm:max-w-[300px] sm:p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--brand-gold)]">
        Reportes · Esta semana
      </div>

      <div className="mt-3 rounded-sm border border-[color:var(--border-default)] bg-[color:var(--surface-2)] p-3">
        <div className="text-[9px] text-[color:var(--text-muted)]">
          Ingresos brutos
        </div>
        <div className="mt-1 text-2xl font-black tracking-tight text-white">
          $487.500
        </div>
        <div className="mt-1 text-[10px] text-[color:var(--success)]">
          ↑ +18% vs semana pasada
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-sm border border-[color:var(--border-subtle)] bg-[color:var(--surface-2)] p-2">
          <div className="text-[8px] text-[color:var(--text-muted)]">
            Turnos
          </div>
          <div className="text-lg font-bold text-white">68</div>
        </div>
        <div className="rounded-sm border border-[color:var(--border-subtle)] bg-[color:var(--surface-2)] p-2">
          <div className="text-[8px] text-[color:var(--text-muted)]">
            Ticket prom.
          </div>
          <div className="text-lg font-bold text-white">$7.169</div>
        </div>
      </div>

      <div className="mt-3 text-[9px] text-[color:var(--text-muted)]">
        Top barberos
      </div>
      <div className="mt-1 space-y-1">
        {[
          { name: "Jeremias", pct: 70 },
          { name: "Mateo", pct: 55 },
          { name: "Lucas", pct: 40 },
        ].map((b) => (
          <div key={b.name} className="space-y-0.5">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-white">{b.name}</span>
              <span className="text-[color:var(--text-muted)]">{b.pct}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[color:var(--surface-3)]">
              <div
                className="h-full bg-[color:var(--brand-gold)]"
                style={{ width: `${b.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Mockup({ kind }: { kind: ShowcaseBlock["mockup"] }) {
  switch (kind) {
    case "turnero":
      return <MockupTurnero />;
    case "publica":
      return <MockupPublica />;
    case "reportes":
      return <MockupReportes />;
    default:
      return null;
  }
}

export function ProductShowcase() {
  return (
    <section className="border-t border-[color:var(--border-subtle)] bg-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <header className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Cómo se ve
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            Fácil de usar{" "}
            <span className="text-[color:var(--brand-gold)]">mientras cortás</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:mt-5 sm:text-base sm:leading-7">
            Interfaz mobile-first, sin curva de aprendizaje, sin pasos
            innecesarios.
          </p>
        </header>

        <div className="mt-10 space-y-10 sm:mt-16 sm:space-y-24">
          {BLOCKS.map((block, idx) => {
            const Icon = block.icon;
            const reverse = idx % 2 === 1;
            return (
              <div
                key={block.title}
                className={`grid grid-cols-[1fr_auto] items-center gap-4 sm:gap-10 lg:grid-cols-2 lg:items-center lg:gap-16 ${
                  reverse ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                {/* Texto */}
                <div className="min-w-0">
                  <div
                    aria-hidden="true"
                    className="inline-flex size-9 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)] sm:size-11"
                  >
                    <Icon className="size-4 sm:size-5" />
                  </div>
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-gold)] sm:mt-4 sm:tracking-[0.32em]">
                    {block.eyebrow}
                  </p>
                  <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-balance text-white sm:text-3xl lg:text-4xl">
                    {block.title}
                  </h3>
                  <p className="mt-2 hidden text-sm leading-6 text-[color:var(--text-secondary)] sm:mt-4 sm:block sm:text-base sm:leading-7">
                    {block.description}
                  </p>
                  <ul className="mt-3 space-y-1.5 sm:mt-5 sm:space-y-2">
                    {block.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-xs text-[color:var(--text-secondary)] sm:gap-2.5 sm:text-sm"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-1 size-1 shrink-0 rounded-full bg-[color:var(--brand-gold)] sm:size-1.5"
                        />
                        <span className="leading-snug sm:leading-normal">
                          {b}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Mockup */}
                <div className="flex justify-center">
                  <Mockup kind={block.mockup} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
