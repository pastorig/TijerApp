/**
 * Tests de la guía de primeros pasos (pura). El riesgo real de la feature está
 * acá: si un paso se da por cumplido cuando en realidad el barbero no lo revisó,
 * termina compartiendo su barbería con un "Corte" a $10.000 que no es su precio.
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-onboarding.ts
 */
import type {
  Barber,
  BarberService,
  DemoBarbershop,
} from "../src/data/demo-barbershops.ts";
import { getOnboardingSteps } from "../src/lib/onboarding-steps.ts";
import {
  DEFAULT_SERVICES,
  DEFAULT_WORKING_HOURS,
} from "../src/lib/onboarding-defaults.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(
    `${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${expected}, obtenido ${got}`}`,
  );
  if (ok) passed++;
  else failed++;
}

/** El servicio tal cual lo deja el registro. */
function defaultService(): BarberService {
  const fallback = DEFAULT_SERVICES[0];
  return {
    id: "svc-1",
    name: fallback.name,
    price: fallback.price,
    durationMinutes: fallback.durationMinutes,
  };
}

function barber(services: BarberService[]): Barber {
  return {
    id: "b-1",
    name: "Santi",
    isActive: true,
    isOwner: true,
    services,
  };
}

/** Barbería tal cual la deja el registro self-serve. */
function freshBarbershop(
  overrides: Partial<DemoBarbershop> = {},
): DemoBarbershop {
  return {
    id: "bs-1",
    slug: "nueva-barberia",
    name: "Nueva Barbería",
    description: "",
    instagram: "",
    whatsapp: "+5493511234567",
    barbers: [barber([defaultService()])],
    workingHours: { ...DEFAULT_WORKING_HOURS },
    ...overrides,
  };
}

function stepDone(shop: DemoBarbershop, id: string, appointments = 0) {
  const step = getOnboardingSteps(shop, appointments).steps.find(
    (s) => s.id === id,
  );
  if (!step) throw new Error(`No existe el paso ${id}`);
  return step.done;
}

// ── 1. Barbería recién provisionada: los 3 obligatorios pendientes ──────────
const fresh = getOnboardingSteps(freshBarbershop(), 0);
check("recién registrada → 0 de 3 obligatorios", fresh.requiredDone, 0);
check("recién registrada → total obligatorios 3", fresh.requiredTotal, 3);
check("recién registrada → guía NO terminada", fresh.isComplete, false);
check("recién registrada → servicios pendiente", stepDone(freshBarbershop(), "servicios"), false);
check("recién registrada → horarios pendiente", stepDone(freshBarbershop(), "horarios"), false);
check("recién registrada → contacto pendiente", stepDone(freshBarbershop(), "contacto"), false);

// ── 2. Precio cambiado → servicios cumplido ─────────────────────────────────
const precioPropio = freshBarbershop({
  barbers: [barber([{ ...defaultService(), price: 8500 }])],
});
check("precio cambiado → servicios cumplido", stepDone(precioPropio, "servicios"), true);

// ── 3. Servicio extra, el genérico intacto → servicios cumplido ─────────────
const conExtra = freshBarbershop({
  barbers: [
    barber([
      defaultService(),
      { id: "svc-2", name: "Barba", price: 6000, durationMinutes: 20 },
    ]),
  ],
});
check("servicio extra agregado → servicios cumplido", stepDone(conExtra, "servicios"), true);

// ── 4. EL CASO TRAMPA: servicio idéntico al del registro → pendiente ────────
const soloDefault = freshBarbershop({ barbers: [barber([defaultService()])] });
check(
  "servicio idéntico al del registro → servicios PENDIENTE (FR-006)",
  stepDone(soloDefault, "servicios"),
  false,
);
// Variante: mismo precio y duración pero renombrado → sí lo revisó.
const renombrado = freshBarbershop({
  barbers: [barber([{ ...defaultService(), name: "Corte de máquina" }])],
});
check("servicio renombrado → servicios cumplido", stepDone(renombrado, "servicios"), true);
// Variante: el nombre con otra capitalización NO cuenta como revisado.
const otraCapitalizacion = freshBarbershop({
  barbers: [barber([{ ...defaultService(), name: "  corte " }])],
});
check(
  "mismo servicio con otra capitalización → sigue PENDIENTE",
  stepDone(otraCapitalizacion, "servicios"),
  false,
);
// Variante: sin ningún servicio → pendiente.
const sinServicios = freshBarbershop({ barbers: [barber([])] });
check("sin servicios → servicios pendiente", stepDone(sinServicios, "servicios"), false);

// ── 5. Horario cambiado (inicio / fin / intervalo) → horarios cumplido ──────
check(
  "horario con otro inicio → horarios cumplido",
  stepDone(freshBarbershop({ workingHours: { ...DEFAULT_WORKING_HOURS, start: "10:00" } }), "horarios"),
  true,
);
check(
  "horario con otro cierre → horarios cumplido",
  stepDone(freshBarbershop({ workingHours: { ...DEFAULT_WORKING_HOURS, end: "21:00" } }), "horarios"),
  true,
);
check(
  "horario con otro intervalo → horarios cumplido",
  stepDone(freshBarbershop({ workingHours: { ...DEFAULT_WORKING_HOURS, intervalMinutes: 45 } }), "horarios"),
  true,
);

// ── 6. Contacto: hace falta dirección E Instagram ───────────────────────────
check(
  "dirección sí pero Instagram vacío → contacto pendiente",
  stepDone(freshBarbershop({ address: "San Martín 123" }), "contacto"),
  false,
);
check(
  "Instagram sí pero dirección vacía → contacto pendiente",
  stepDone(freshBarbershop({ instagram: "@svbarber" }), "contacto"),
  false,
);
check(
  "dirección e Instagram cargados → contacto cumplido",
  stepDone(freshBarbershop({ address: "San Martín 123", instagram: "@svbarber" }), "contacto"),
  true,
);
check(
  "dirección con solo espacios → contacto pendiente",
  stepDone(freshBarbershop({ address: "   ", instagram: "@svbarber" }), "contacto"),
  false,
);

// ── 7. Barbería vieja bien configurada → todo cumplido, guía terminada ──────
const configurada = freshBarbershop({
  slug: "sv-barber",
  address: "San Martín 123",
  instagram: "@svbarber",
  logoUrl: "https://example.com/logo.png",
  workingHours: { start: "10:00", end: "20:00", intervalMinutes: 45 },
  barbers: [
    barber([
      { id: "svc-1", name: "Corte", price: 9000, durationMinutes: 45 },
      { id: "svc-2", name: "Corte + barba", price: 13000, durationMinutes: 60 },
    ]),
  ],
});
const configuradaProgress = getOnboardingSteps(configurada, 78);
check("barbería configurada → 3 de 3", configuradaProgress.requiredDone, 3);
check("barbería configurada → guía terminada (FR-010)", configuradaProgress.isComplete, true);
check(
  "barbería configurada → ningún paso pendiente",
  configuradaProgress.steps.every((step) => step.done),
  true,
);

// ── 8. Turnos recibidos → paso "probá una reserva" cumplido ─────────────────
check("sin turnos → prueba pendiente", stepDone(freshBarbershop(), "prueba", 0), false);
check("con 1 turno → prueba cumplido", stepDone(freshBarbershop(), "prueba", 1), true);

// ── 9. Solo opcionales pendientes → la guía cuenta como terminada ───────────
const soloOpcionales = freshBarbershop({
  address: "San Martín 123",
  instagram: "@svbarber",
  workingHours: { ...DEFAULT_WORKING_HOURS, end: "21:00" },
  barbers: [barber([{ ...defaultService(), price: 9000 }])],
});
const soloOpcionalesProgress = getOnboardingSteps(soloOpcionales, 0);
check(
  "sin logo y sin reserva de prueba → guía terminada igual",
  soloOpcionalesProgress.isComplete,
  true,
);
check(
  "sin logo → paso logo pendiente pero no bloquea",
  soloOpcionalesProgress.steps.find((s) => s.id === "logo")?.done,
  false,
);
check(
  "paso compartir se cumple al estar listos los obligatorios",
  soloOpcionalesProgress.steps.find((s) => s.id === "compartir")?.done,
  true,
);

// ── Extras de forma ────────────────────────────────────────────────────────
check(
  "publicPath es la landing de la barbería",
  getOnboardingSteps(freshBarbershop(), 0).publicPath,
  "/nueva-barberia",
);
check(
  "los pasos obligatorios son exactamente 3",
  getOnboardingSteps(freshBarbershop(), 0).steps.filter((s) => !s.optional).length,
  3,
);

console.log(`\n${passed}/${passed + failed} OK`);
if (failed > 0) process.exit(1);
