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
  return (
    <div className="mockup-frame aspect-[9/12] w-full max-w-[200px] bg-[color:var(--surface-1)] p-2.5 sm:aspect-[9/14] sm:max-w-[300px] sm:p-3">
      <div className="text-center">
        <div className="mx-auto size-12 rounded-full border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)]" />
        <div className="mt-2 text-sm font-black uppercase tracking-tight text-white">
          SV BARBER
        </div>
        <div className="text-[9px] text-[color:var(--text-secondary)]">
          Córdoba · Barbería premium
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="aspect-square rounded-sm bg-gradient-to-br from-[color:var(--surface-3)] to-[color:var(--surface-2)]"
          />
        ))}
      </div>

      <div className="mt-3 rounded-sm border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold)] py-2 text-center text-[10px] font-bold uppercase tracking-wider text-black">
        Reservar turno
      </div>

      <div className="mt-2 space-y-1">
        <div className="text-[9px] text-[color:var(--text-muted)]">
          Próximos turnos disponibles
        </div>
        {["Lun 9:30", "Lun 10:00", "Lun 11:00", "Mar 9:00"].map((slot) => (
          <div
            key={slot}
            className="flex items-center justify-between rounded-sm border border-[color:var(--border-subtle)] px-2 py-1"
          >
            <span className="text-[10px] text-white">{slot}</span>
            <span className="text-[9px] text-[color:var(--brand-gold)]">
              Libre
            </span>
          </div>
        ))}
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
          { name: "Santi", pct: 70 },
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
            Diseñado para usarlo{" "}
            <span className="text-[color:var(--brand-gold)]">en el local</span>
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
