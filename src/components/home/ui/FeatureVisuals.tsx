/**
 * FeatureVisuals — mini-visualizaciones del producto real para las cards
 * de marketing (/producto, home). Cada una "muestra el producto" en chico
 * en vez de un ícono decorativo. Server-safe (sin hooks): SVG + divs con
 * tokens negro/dorado.
 *
 * Todas ocupan el ancho de su contenedor con altura fija (~136px) para que
 * la grilla quede pareja.
 */

const VIZ_HEIGHT = 136;

/** Barra de acento + bloque de turno en miniatura. */
function MiniBlock({
  top,
  height,
  name,
  accent,
}: {
  top: number;
  height: number;
  name: string;
  accent: "gold" | "green";
}) {
  const bar =
    accent === "green" ? "var(--success)" : "var(--brand-gold)";
  const glow =
    accent === "green"
      ? "rgba(110,231,183,0.14)"
      : "rgba(201,162,62,0.16)";
  return (
    <div
      className="absolute inset-x-1 overflow-hidden rounded-[3px] border border-[color:var(--border-default)] bg-[color:var(--surface-2)]"
      style={{
        top,
        height,
        boxShadow: "0 4px 10px -6px rgba(0,0,0,0.8)",
        backgroundImage: `radial-gradient(120% 90% at 0% 0%, ${glow}, transparent 60%)`,
      }}
    >
      <span
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: bar }}
      />
      <span className="absolute left-2 top-1 text-[7px] font-bold leading-none text-white">
        {name}
      </span>
    </div>
  );
}

/** 1 · Turnero del día — mini timeline de 2 barberos con línea "ahora". */
export function VizAgenda() {
  return (
    <div
      className="viz-screen flex gap-1.5 p-2.5"
      style={{ height: VIZ_HEIGHT }}
    >
      <div className="flex flex-col justify-between py-0.5 pr-0.5 font-mono text-[7px] text-[color:var(--text-muted)]">
        <span>10</span>
        <span>11</span>
        <span>12</span>
        <span>13</span>
      </div>
      {/* Columna barbero A */}
      <div className="relative flex-1 rounded-[4px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)]/60">
        <MiniBlock top={4} height={30} name="Lucas" accent="green" />
        <MiniBlock top={40} height={22} name="Diego" accent="gold" />
        <MiniBlock top={92} height={30} name="Nico" accent="green" />
        {/* línea ahora */}
        <div
          className="absolute inset-x-0 z-10 flex items-center"
          style={{ top: 70 }}
        >
          <span className="size-1 -translate-x-1/2 rounded-full bg-[color:var(--brand-gold)] shadow-[0_0_6px_1px_rgba(201,162,62,0.7)]" />
          <span className="h-px flex-1 bg-[color:var(--brand-gold)]/70" />
        </div>
      </div>
      {/* Columna barbero B */}
      <div className="relative flex-1 rounded-[4px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)]/60">
        <MiniBlock top={16} height={26} name="Bruno" accent="green" />
        <MiniBlock top={62} height={34} name="Tomás" accent="gold" />
        <div
          className="absolute inset-x-0 z-10 flex items-center"
          style={{ top: 70 }}
        >
          <span className="size-1 -translate-x-1/2 rounded-full bg-[color:var(--brand-gold)] shadow-[0_0_6px_1px_rgba(201,162,62,0.7)]" />
          <span className="h-px flex-1 bg-[color:var(--brand-gold)]/70" />
        </div>
      </div>
    </div>
  );
}

/** 2 · Multi-barbero — 3 agendas en paralelo con avatar por barbero. */
export function VizMultiBarbero() {
  const cols = [
    { initials: "JV", name: "Jere", blocks: ["green", "gold"] as const },
    { initials: "MA", name: "Mateo", blocks: ["gold", "green"] as const },
    { initials: "RS", name: "Rodri", blocks: ["green"] as const },
  ];
  return (
    <div
      className="viz-screen flex items-stretch gap-1.5 p-2.5"
      style={{ height: VIZ_HEIGHT }}
    >
      {cols.map((col) => (
        <div key={col.initials} className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/40 bg-[color:var(--surface-3)] text-[7px] font-black text-[color:var(--brand-gold)]">
              {col.initials}
            </span>
            <span className="truncate text-[8px] font-bold text-white">
              {col.name}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-1 rounded-[4px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)]/60 p-1">
            {col.blocks.map((accent, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-[3px] border border-[color:var(--border-default)] bg-[color:var(--surface-2)]"
                style={{ height: 20 }}
              >
                <span
                  className="absolute inset-y-0 left-0 w-[3px]"
                  style={{
                    background:
                      accent === "green"
                        ? "var(--success)"
                        : "var(--brand-gold)",
                  }}
                />
              </div>
            ))}
            <div className="mt-auto text-center text-[7px] font-semibold text-[color:var(--text-muted)]">
              +
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 3 · Reservas públicas — mock de teléfono con grilla de horarios. */
export function VizReservas() {
  const slots = [
    { t: "10:00", state: "free" },
    { t: "10:30", state: "sel" },
    { t: "11:00", state: "taken" },
    { t: "11:30", state: "free" },
    { t: "12:00", state: "free" },
    { t: "12:30", state: "taken" },
  ] as const;
  return (
    <div
      className="viz-screen flex items-center justify-center p-2.5"
      style={{ height: VIZ_HEIGHT }}
    >
      <div className="w-[128px] rounded-[10px] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-2 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.9)]">
        <div className="mb-1.5 flex items-center gap-1">
          <span className="size-1 rounded-full bg-[color:var(--brand-gold)]" />
          <span className="text-[7px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            Elegí tu horario
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {slots.map((s) => (
            <span
              key={s.t}
              className={
                s.state === "sel"
                  ? "rounded-[3px] bg-gold-grad px-1 py-1 text-center text-[7px] font-black text-black"
                  : s.state === "taken"
                    ? "rounded-[3px] border border-[color:var(--border-subtle)] px-1 py-1 text-center text-[7px] font-semibold text-[color:var(--text-subtle)] line-through"
                    : "rounded-[3px] border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] px-1 py-1 text-center text-[7px] font-semibold text-[color:var(--text-secondary)]"
              }
            >
              {s.t}
            </span>
          ))}
        </div>
        <div className="mt-1.5 rounded-[3px] bg-gold-grad py-1 text-center text-[7px] font-black uppercase tracking-[0.1em] text-black">
          Reservar
        </div>
      </div>
    </div>
  );
}

/** 4 · Aprovechá tu horario — gauge de ocupación de la jornada. */
export function VizOcupacion() {
  const size = 92;
  const stroke = 10;
  const pct = 82;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  return (
    <div
      className="viz-screen flex items-center gap-3 p-3"
      style={{ height: VIZ_HEIGHT }}
    >
      <span
        className="relative inline-flex shrink-0"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id="viz-gauge" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8a6e25" />
              <stop offset="50%" stopColor="#c9a23e" />
              <stop offset="100%" stopColor="#e2c266" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            style={{ stroke: "var(--surface-2)" }}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#viz-gauge)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black tabular-nums text-white">
            {pct}%
          </span>
        </span>
      </span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
          Ocupación de hoy
        </p>
        <p className="mt-1 text-sm font-black leading-tight text-white">
          <span className="text-gold-gradient">13 cortes</span> entran
        </p>
        <p className="mt-1 text-[9px] leading-tight text-[color:var(--text-muted)]">
          Cerrá 30′ más tarde y metés{" "}
          <span className="font-bold text-[color:var(--brand-gold)]">
            2 más
          </span>
        </p>
      </div>
    </div>
  );
}

/** 5 · WhatsApp integrado — mock de mensaje con el detalle del turno. */
export function VizWhatsApp() {
  return (
    <div
      className="viz-screen flex flex-col justify-center gap-2 p-3"
      style={{ height: VIZ_HEIGHT }}
    >
      <div className="flex items-center gap-1.5">
        <span className="flex size-4 items-center justify-center rounded-full bg-[color:var(--success)]/90">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 6L9 17l-5-5"
              stroke="#0d0d0d"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
          WhatsApp
        </span>
      </div>
      <div className="max-w-[86%] self-end rounded-[8px] rounded-br-[2px] border border-[color:var(--success)]/25 bg-[color:var(--success-soft)] px-2.5 py-1.5">
        <p className="text-[9px] font-bold leading-tight text-white">
          ¡Hola Nahuel! 💈
        </p>
        <p className="mt-0.5 text-[8px] leading-snug text-[color:var(--text-secondary)]">
          Te confirmamos tu turno: <b className="text-white">Corte + barba</b>{" "}
          hoy <b className="text-white">16:30</b> con Mateo.
        </p>
        <span className="mt-1 flex items-center justify-end gap-0.5 text-[6px] text-[color:var(--text-muted)]">
          16:02
          <svg width="10" height="8" viewBox="0 0 16 11" fill="none">
            <path
              d="M1 6l3 3 6-7M6 9l1 0.5 6-7"
              stroke="#93c5fd"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}

/** 6 · Reportes y métricas — mini bar chart de ingresos + KPI. */
export function VizReportes() {
  const bars = [38, 52, 44, 68, 60, 82, 74];
  const max = Math.max(...bars);
  return (
    <div className="viz-screen p-3" style={{ height: VIZ_HEIGHT }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            Ingresos · 7 días
          </p>
          <p className="mt-0.5 text-lg font-black leading-none text-gold-gradient">
            $284.500
          </p>
        </div>
        <span className="rounded-full border border-[color:var(--success)]/30 bg-[color:var(--success-soft)] px-1.5 py-0.5 text-[8px] font-bold text-[color:var(--success)]">
          ▲ 18%
        </span>
      </div>
      <div className="mt-2.5 flex h-[52px] items-end gap-1.5">
        {bars.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-[2px]"
            style={{
              height: `${(v / max) * 100}%`,
              backgroundImage:
                i === bars.length - 1
                  ? "linear-gradient(180deg, var(--brand-gold-hi), var(--brand-gold-lo))"
                  : "linear-gradient(180deg, rgba(201,162,62,0.55), rgba(138,110,37,0.25))",
              boxShadow:
                i === bars.length - 1
                  ? "0 0 12px -3px rgba(201,162,62,0.6)"
                  : undefined,
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[6px] text-[color:var(--text-subtle)]">
        <span>L</span>
        <span>M</span>
        <span>M</span>
        <span>J</span>
        <span>V</span>
        <span>S</span>
        <span>D</span>
      </div>
    </div>
  );
}
