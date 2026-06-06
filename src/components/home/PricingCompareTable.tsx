import { Check, Minus } from "lucide-react";

type Row = {
  category: string;
  features: {
    label: string;
    solo: boolean | string;
    esencial: boolean | string;
    pro: boolean | string;
  }[];
};

const ROWS: Row[] = [
  {
    category: "Operación",
    features: [
      { label: "Barberos incluidos", solo: "1", esencial: "Ilimitado", pro: "Ilimitado" },
      { label: "Reservas online", solo: "Ilimitadas", esencial: "Ilimitadas", pro: "Ilimitadas" },
      { label: "URL pública con marca", solo: true, esencial: true, pro: true },
      { label: "PWA instalable", solo: true, esencial: true, pro: true },
      { label: "Multi-barbero con horarios propios", solo: false, esencial: true, pro: true },
      { label: "Lista de espera con tokens", solo: false, esencial: true, pro: true },
      { label: "Cierre de caja diario", solo: false, esencial: true, pro: true },
    ],
  },
  {
    category: "Comunicación",
    features: [
      { label: "Recordatorios por email", solo: true, esencial: true, pro: true },
      { label: "Confirmaciones por link", solo: true, esencial: true, pro: true },
      { label: "WhatsApp links integrados", solo: true, esencial: true, pro: true },
      { label: "Push notifications", solo: false, esencial: false, pro: true },
      { label: "Logo en emails transaccionales", solo: false, esencial: false, pro: true },
    ],
  },
  {
    category: "Reportes y datos",
    features: [
      { label: "Reportes operativos", solo: "Básicos", esencial: "Completos", pro: "Avanzados" },
      { label: "Top servicios y horarios pico", solo: false, esencial: true, pro: true },
      { label: "Comparativas multi-barbero", solo: false, esencial: false, pro: true },
      { label: "Export PDF + reportes mensuales por email", solo: false, esencial: false, pro: true },
    ],
  },
  {
    category: "Crecimiento",
    features: [
      { label: "Cupones de descuento", solo: false, esencial: false, pro: true },
      { label: "Sistema de fidelización", solo: false, esencial: false, pro: true },
      { label: "Acceso anticipado a features nuevas", solo: false, esencial: false, pro: true },
    ],
  },
  {
    category: "Equipo y soporte",
    features: [
      { label: "Usuarios admin", solo: "1", esencial: "1", pro: "Hasta 5" },
      { label: "Soporte por email", solo: "48-72h", esencial: "24-48h", pro: "<24h" },
      { label: "Soporte prioritario por WhatsApp", solo: false, esencial: false, pro: true },
    ],
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <Check
        aria-label="Incluido"
        className="size-3.5 text-[color:var(--brand-gold)] sm:size-4"
      />
    );
  }
  if (value === false) {
    return (
      <Minus
        aria-label="No incluido"
        className="size-3.5 text-[color:var(--text-subtle)] sm:size-4"
      />
    );
  }
  return (
    <span className="text-center text-[10px] font-semibold leading-tight text-white sm:text-sm sm:leading-normal">
      {value}
    </span>
  );
}

export function PricingCompareTable() {
  return (
    <section className="border-t border-[color:var(--border-subtle)] bg-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <header className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Comparativa completa
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            Todos los features,{" "}
            <span className="text-[color:var(--brand-gold)]">lado a lado</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:mt-5 sm:text-base sm:leading-7">
            Mirá exactamente qué incluye cada plan antes de decidir.
          </p>
        </header>

        <div className="mt-10 overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] sm:mt-12">
          {/* Header row — sticky en mobile para que se vea durante el scroll */}
          <div className="sticky top-0 z-10 grid grid-cols-[1.4fr_repeat(3,_minmax(0,_1fr))] gap-1.5 border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-2)] px-2.5 py-3 sm:gap-4 sm:px-6 sm:py-4">
            <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)] sm:text-xs sm:tracking-[0.18em]">
              Feature
            </div>
            {["Solo", "Esencial", "Pro"].map((name) => (
              <div key={name} className="text-center">
                <div
                  className={`text-[11px] font-black uppercase tracking-tight sm:text-sm ${
                    name === "Esencial"
                      ? "text-[color:var(--brand-gold)]"
                      : "text-white"
                  }`}
                >
                  {name}
                </div>
                <div className="text-[9px] text-[color:var(--text-muted)] sm:text-[10px]">
                  USD {name === "Solo" ? "10" : name === "Esencial" ? "20" : "40"}
                </div>
              </div>
            ))}
          </div>

          {/* Rows by category */}
          {ROWS.map((row) => (
            <div key={row.category}>
              <div className="border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] px-2.5 py-1.5 sm:px-6 sm:py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] sm:text-[11px] sm:tracking-[0.18em]">
                  {row.category}
                </p>
              </div>
              {row.features.map((feature, idx) => (
                <div
                  key={feature.label}
                  className={`grid grid-cols-[1.4fr_repeat(3,_minmax(0,_1fr))] items-center gap-1.5 px-2.5 py-1.5 sm:gap-4 sm:px-6 sm:py-3 ${
                    idx % 2 === 0
                      ? "bg-[color:var(--surface-1)]"
                      : "bg-transparent"
                  }`}
                >
                  <div className="text-[11px] leading-tight text-[color:var(--text-secondary)] sm:text-sm sm:leading-normal">
                    {feature.label}
                  </div>
                  <div className="flex justify-center">
                    <CellValue value={feature.solo} />
                  </div>
                  <div className="-my-1.5 flex justify-center bg-[color:var(--brand-gold-soft)]/40 py-1.5">
                    <CellValue value={feature.esencial} />
                  </div>
                  <div className="flex justify-center">
                    <CellValue value={feature.pro} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
